import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from '../db.js';
import auth from '../middleware/auth.js';
import { scoreApplicationById, aiScoringEnabled } from '../services/aiScore.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

const ORG_ID = 1; // single agency for now; schema is tenant-ready via org_id

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
router.post('/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  const match = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH || '');
  if (!match) return res.status(401).json({ error: 'Invalid password' });

  const token = jwt.sign({ role: 'admin', org_id: ORG_ID }, process.env.JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

// ---------------------------------------------------------------------------
// Dashboard stats — the KPIs a staffing owner watches daily
// ---------------------------------------------------------------------------
router.get('/stats', auth, (req, res) => {
  const one = (sql, ...args) => db.prepare(sql).get(...args).n;

  const activeJobs = one("SELECT COUNT(*) n FROM jobs WHERE status = 'active'");
  const totalJobs = one('SELECT COUNT(*) n FROM jobs');
  const newApplicants = one("SELECT COUNT(*) n FROM applications WHERE status = 'new'");
  const reviewing = one("SELECT COUNT(*) n FROM applications WHERE status = 'reviewing'");
  const interviewing = one("SELECT COUNT(*) n FROM applications WHERE status = 'interviewing'");
  const hired = one("SELECT COUNT(*) n FROM applications WHERE status = 'hired'");
  const rejected = one("SELECT COUNT(*) n FROM applications WHERE status = 'rejected'");
  const totalApplicants = one('SELECT COUNT(*) n FROM applications');
  const employers = one('SELECT COUNT(*) n FROM employers');

  // Fill rate: closed (filled) jobs vs all non-draft jobs.
  const closedJobs = one("SELECT COUNT(*) n FROM jobs WHERE status = 'closed'");
  const fillableJobs = one("SELECT COUNT(*) n FROM jobs WHERE status IN ('active','closed')");
  const fillRate = fillableJobs ? Math.round((closedJobs / fillableJobs) * 100) : 0;

  // Avg time-to-fill (days) across jobs that produced a hire.
  const ttf = db.prepare(`
    SELECT AVG(julianday(a.updated_at) - julianday(j.created_at)) AS d
    FROM applications a JOIN jobs j ON a.job_id = j.id
    WHERE a.status = 'hired'
  `).get().d;
  const timeToFill = ttf != null ? Math.max(0, Math.round(ttf)) : null;

  // Pipeline velocity: applicants moved/created in the last 7 days.
  const pipelineVelocity = one("SELECT COUNT(*) n FROM applications WHERE created_at >= datetime('now','-7 days')");

  // Gross margin %: (bill_rate - rate) / bill_rate across active jobs.
  const margin = db.prepare(`
    SELECT AVG((bill_rate - rate) / bill_rate) AS m
    FROM jobs WHERE status = 'active' AND bill_rate > 0 AND rate IS NOT NULL
  `).get().m;
  const grossMargin = margin != null ? Math.round(margin * 100) : null;

  // Outstanding receivables (sent + overdue invoices).
  const outstanding = db.prepare(
    "SELECT COALESCE(SUM(amount),0) s FROM invoices WHERE status IN ('sent','overdue')"
  ).get().s;

  res.json({
    activeJobs, totalJobs, newApplicants, reviewing, interviewing, hired, rejected,
    totalApplicants, employers, fillRate, timeToFill, pipelineVelocity, grossMargin,
    outstanding, aiScoring: aiScoringEnabled(),
  });
});

// ---------------------------------------------------------------------------
// Jobs CRUD (with employer, rate/bill_rate, status)
// ---------------------------------------------------------------------------
const jobsWithMeta = `
  SELECT j.*, e.name AS company,
         (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count
  FROM jobs j LEFT JOIN employers e ON j.employer_id = e.id
`;

router.get('/jobs', auth, (req, res) => {
  res.json(db.prepare(`${jobsWithMeta} ORDER BY j.created_at DESC`).all());
});

router.post('/jobs', auth, (req, res) => {
  const { title, employer_id, location, type, description, requirements, rate, bill_rate, status } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Title and description are required' });

  const st = status || 'active';
  const result = db.prepare(
    `INSERT INTO jobs (org_id, employer_id, title, location, type, description, requirements, rate, bill_rate, status, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    ORG_ID, employer_id || null, title, location || 'Your City, ST', type || 'Full-Time',
    description, requirements || '', rate ?? null, bill_rate ?? null, st, st === 'active' ? 1 : 0
  );
  res.status(201).json(db.prepare(`${jobsWithMeta} WHERE j.id = ?`).get(result.lastInsertRowid));
});

router.put('/jobs/:id', auth, (req, res) => {
  const { title, employer_id, location, type, description, requirements, rate, bill_rate, status } = req.body;
  const st = status || 'active';
  db.prepare(
    `UPDATE jobs SET employer_id = ?, title = ?, location = ?, type = ?, description = ?, requirements = ?,
       rate = ?, bill_rate = ?, status = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    employer_id || null, title, location, type, description, requirements || '',
    rate ?? null, bill_rate ?? null, st, st === 'active' ? 1 : 0, req.params.id
  );
  const job = db.prepare(`${jobsWithMeta} WHERE j.id = ?`).get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

router.delete('/jobs/:id', auth, (req, res) => {
  const result = db.prepare('DELETE FROM jobs WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Job not found' });
  res.json({ message: 'Job deleted' });
});

// ---------------------------------------------------------------------------
// Applicants (pipeline) — list, status change, AI re-score, résumé download
// ---------------------------------------------------------------------------
const APPLICANT_STATUSES = ['new', 'reviewing', 'interviewing', 'hired', 'rejected'];

router.get('/applicants', auth, (req, res) => {
  const { job_id, status } = req.query;
  let sql = `
    SELECT a.*, j.title AS job_title, e.name AS company
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    LEFT JOIN employers e ON j.employer_id = e.id`;
  const where = [];
  const args = [];
  if (job_id) { where.push('a.job_id = ?'); args.push(job_id); }
  if (status) { where.push('a.status = ?'); args.push(status); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY a.created_at DESC';
  const rows = db.prepare(sql).all(...args).map((r) => ({
    ...r,
    ai_reasons: r.ai_reasons ? safeParse(r.ai_reasons) : [],
  }));
  res.json(rows);
});

router.patch('/applicants/:id', auth, (req, res) => {
  const { status } = req.body;
  if (status && !APPLICANT_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const existing = db.prepare('SELECT id FROM applications WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Applicant not found' });

  if (status) {
    db.prepare("UPDATE applications SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .run(status, req.params.id);
  }
  res.json(db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id));
});

// Trigger (or re-run) AI scoring for one applicant.
router.post('/applicants/:id/score', auth, async (req, res) => {
  if (!aiScoringEnabled()) {
    return res.status(503).json({ error: 'AI scoring unavailable — set ANTHROPIC_API_KEY' });
  }
  const result = await scoreApplicationById(db, Number(req.params.id));
  if (!result) return res.status(404).json({ error: 'Could not score applicant' });
  res.json(result);
});

router.get('/applicants/:id/resume', auth, (req, res) => {
  const app = db.prepare('SELECT resume_path FROM applications WHERE id = ?').get(req.params.id);
  if (!app || !app.resume_path) return res.status(404).json({ error: 'Résumé not found' });

  const resumeDir = process.env.NODE_ENV === 'production'
    ? '/app/persist/resumes'
    : join(__dirname, '..', '..', 'uploads', 'resumes');
  res.download(join(resumeDir, app.resume_path));
});

// ---------------------------------------------------------------------------
// Employers (client CRM) CRUD
// ---------------------------------------------------------------------------
const employersWithMeta = `
  SELECT e.*,
    (SELECT COUNT(*) FROM jobs j WHERE j.employer_id = e.id AND j.status = 'active') AS open_roles,
    (SELECT COUNT(*) FROM jobs j WHERE j.employer_id = e.id) AS total_jobs
  FROM employers e
`;

router.get('/employers', auth, (req, res) => {
  res.json(db.prepare(`${employersWithMeta} ORDER BY e.name`).all());
});

router.post('/employers', auth, (req, res) => {
  const { name, contact_name, contact_email, phone, plan, since, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Company name is required' });
  const result = db.prepare(
    `INSERT INTO employers (org_id, name, contact_name, contact_email, phone, plan, since, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(ORG_ID, name, contact_name || '', contact_email || '', phone || '', plan || 'Trial', since || null, notes || '');
  res.status(201).json(db.prepare(`${employersWithMeta} WHERE e.id = ?`).get(result.lastInsertRowid));
});

router.put('/employers/:id', auth, (req, res) => {
  const { name, contact_name, contact_email, phone, plan, since, notes } = req.body;
  db.prepare(
    `UPDATE employers SET name = ?, contact_name = ?, contact_email = ?, phone = ?, plan = ?, since = ?, notes = ? WHERE id = ?`
  ).run(name, contact_name || '', contact_email || '', phone || '', plan || 'Trial', since || null, notes || '', req.params.id);
  const employer = db.prepare(`${employersWithMeta} WHERE e.id = ?`).get(req.params.id);
  if (!employer) return res.status(404).json({ error: 'Employer not found' });
  res.json(employer);
});

router.delete('/employers/:id', auth, (req, res) => {
  const result = db.prepare('DELETE FROM employers WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Employer not found' });
  res.json({ message: 'Employer deleted' });
});

// ---------------------------------------------------------------------------
// Invoices (employer billing)
// ---------------------------------------------------------------------------
const invoicesWithMeta = `
  SELECT i.*, e.name AS company FROM invoices i LEFT JOIN employers e ON i.employer_id = e.id
`;
const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue'];

router.get('/invoices', auth, (req, res) => {
  res.json(db.prepare(`${invoicesWithMeta} ORDER BY i.created_at DESC`).all());
});

router.post('/invoices', auth, (req, res) => {
  const { employer_id, number, amount, status, issued_at, due_at } = req.body;
  if (!employer_id) return res.status(400).json({ error: 'Employer is required' });
  const st = INVOICE_STATUSES.includes(status) ? status : 'draft';
  const num = number || `INV-${1000 + (db.prepare('SELECT COUNT(*) n FROM invoices').get().n + 1)}`;
  const result = db.prepare(
    `INSERT INTO invoices (org_id, employer_id, number, amount, status, issued_at, due_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(ORG_ID, employer_id, num, Number(amount) || 0, st, issued_at || null, due_at || null);
  res.status(201).json(db.prepare(`${invoicesWithMeta} WHERE i.id = ?`).get(result.lastInsertRowid));
});

router.put('/invoices/:id', auth, (req, res) => {
  const { employer_id, number, amount, status, issued_at, due_at } = req.body;
  const st = INVOICE_STATUSES.includes(status) ? status : 'draft';
  db.prepare(
    `UPDATE invoices SET employer_id = ?, number = ?, amount = ?, status = ?, issued_at = ?, due_at = ? WHERE id = ?`
  ).run(employer_id, number, Number(amount) || 0, st, issued_at || null, due_at || null, req.params.id);
  const invoice = db.prepare(`${invoicesWithMeta} WHERE i.id = ?`).get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json(invoice);
});

router.delete('/invoices/:id', auth, (req, res) => {
  const result = db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ message: 'Invoice deleted' });
});

// ---------------------------------------------------------------------------
// Documents — résumés on file (derived from applications)
// ---------------------------------------------------------------------------
router.get('/documents', auth, (req, res) => {
  res.json(db.prepare(`
    SELECT a.id AS application_id, a.name AS applicant_name, a.resume_path,
           a.created_at, j.title AS job_title, e.name AS company
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    LEFT JOIN employers e ON j.employer_id = e.id
    WHERE a.resume_path IS NOT NULL AND a.resume_path != ''
    ORDER BY a.created_at DESC
  `).all());
});

// ---------------------------------------------------------------------------
// Settings — agency profile stored as JSON on the organization row
// ---------------------------------------------------------------------------
router.get('/settings', auth, (req, res) => {
  const org = db.prepare('SELECT id, name, settings FROM organizations WHERE id = ?').get(ORG_ID);
  res.json({ id: org.id, name: org.name, settings: safeParse(org.settings) || {}, aiScoring: aiScoringEnabled() });
});

router.put('/settings', auth, (req, res) => {
  const { name, settings } = req.body;
  db.prepare('UPDATE organizations SET name = COALESCE(?, name), settings = ? WHERE id = ?')
    .run(name || null, JSON.stringify(settings || {}), ORG_ID);
  const org = db.prepare('SELECT id, name, settings FROM organizations WHERE id = ?').get(ORG_ID);
  res.json({ id: org.id, name: org.name, settings: safeParse(org.settings) || {} });
});

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

export default router;
