import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { unlinkSync } from 'fs';
import db from '../db.js';
import auth, { requireRole, blockViewerWrites } from '../middleware/auth.js';
import crypto from 'crypto';
import { scoreApplicationById, aiScoringEnabled, draftFollowUp } from '../services/aiScore.js';
import {
  qboConfigured, buildAuthUrl, savePendingState, getQbo, clearQbo, pushInvoice,
} from '../services/quickbooks.js';
import { getStripeSubscription } from './stripe.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

const ORG_ID = 1; // single agency for now; schema is tenant-ready via org_id

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
// Throttle brute-force attempts against user passwords.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in a few minutes.' },
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).trim().toLowerCase());
  const hash = user?.password_hash || '$2b$10$invalidsaltinvalidsaltinvalidsaltinvalidsaltinvalidsa';
  const match = await bcrypt.compare(password, hash);
  if (!user || !user.active || !match) return res.status(401).json({ error: 'Invalid email or password' });

  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.get('/me', auth, (req, res) => {
  res.json({ user: req.user });
});

router.put('/me/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password are required' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  const match = await bcrypt.compare(currentPassword, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

  const hash = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ message: 'Password updated' });
});

// ---------------------------------------------------------------------------
// Team — the Owner manages named recruiter/viewer accounts under one login.
// ---------------------------------------------------------------------------
const ROLES = ['owner', 'recruiter', 'viewer'];

router.get('/team', auth, requireRole('owner'), (req, res) => {
  res.json(db.prepare('SELECT id, name, email, role, active, created_at, last_login_at FROM users ORDER BY created_at').all());
});

router.post('/team', auth, requireRole('owner'), async (req, res) => {
  const { name, email, role, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) return res.status(409).json({ error: 'A team member with that email already exists' });

  const hash = await bcrypt.hash(password, 10);
  const result = db.prepare(
    'INSERT INTO users (org_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)'
  ).run(ORG_ID, name, normalizedEmail, hash, role);
  res.status(201).json(db.prepare('SELECT id, name, email, role, active, created_at, last_login_at FROM users WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/team/:id', auth, requireRole('owner'), (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Team member not found' });

  const { name, role, active } = req.body;
  if (role && !ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });

  // Guard against locking the agency out of its own account by demoting,
  // deactivating, or deleting the last remaining Owner.
  const losingLastOwner = target.role === 'owner' && target.active
    && ((role && role !== 'owner') || active === 0 || active === false);
  if (losingLastOwner) {
    const ownerCount = db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'owner' AND active = 1").get().n;
    if (ownerCount <= 1) return res.status(400).json({ error: 'Cannot remove the last Owner account' });
  }

  db.prepare(
    'UPDATE users SET name = COALESCE(?, name), role = COALESCE(?, role), active = COALESCE(?, active) WHERE id = ?'
  ).run(name || null, role || null, active === undefined ? null : (active ? 1 : 0), req.params.id);

  res.json(db.prepare('SELECT id, name, email, role, active, created_at, last_login_at FROM users WHERE id = ?').get(req.params.id));
});

router.post('/team/:id/reset-password', auth, requireRole('owner'), async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Team member not found' });

  const hash = await bcrypt.hash(password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
  res.json({ message: 'Password updated' });
});

router.delete('/team/:id', auth, requireRole('owner'), (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Team member not found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'You cannot remove your own account' });

  if (target.role === 'owner' && target.active) {
    const ownerCount = db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'owner' AND active = 1").get().n;
    if (ownerCount <= 1) return res.status(400).json({ error: 'Cannot remove the last Owner account' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'Team member removed' });
});

// ---------------------------------------------------------------------------
// Dashboard stats — the KPIs a staffing owner watches daily
// ---------------------------------------------------------------------------
router.get('/stats', auth, blockViewerWrites, (req, res) => {
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
         (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count,
         (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.status = 'hired') AS positions_filled
  FROM jobs j LEFT JOIN employers e ON j.employer_id = e.id
`;

function parsePositionsNeeded(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

router.get('/jobs', auth, blockViewerWrites, (req, res) => {
  res.json(db.prepare(`${jobsWithMeta} ORDER BY j.created_at DESC`).all());
});

router.post('/jobs', auth, blockViewerWrites, (req, res) => {
  const { title, employer_id, location, type, description, requirements, rate, bill_rate, status, positions_needed } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Title and description are required' });

  const st = status || 'active';
  const result = db.prepare(
    `INSERT INTO jobs (org_id, employer_id, title, location, type, description, requirements, rate, bill_rate, status, positions_needed, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    ORG_ID, employer_id || null, title, location || 'Your City, ST', type || 'Full-Time',
    description, requirements || '', rate ?? null, bill_rate ?? null, st, parsePositionsNeeded(positions_needed), st === 'active' ? 1 : 0
  );
  res.status(201).json(db.prepare(`${jobsWithMeta} WHERE j.id = ?`).get(result.lastInsertRowid));
});

router.put('/jobs/:id', auth, blockViewerWrites, (req, res) => {
  const { title, employer_id, location, type, description, requirements, rate, bill_rate, status, positions_needed } = req.body;
  const st = status || 'active';
  db.prepare(
    `UPDATE jobs SET employer_id = ?, title = ?, location = ?, type = ?, description = ?, requirements = ?,
       rate = ?, bill_rate = ?, status = ?, positions_needed = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    employer_id || null, title, location, type, description, requirements || '',
    rate ?? null, bill_rate ?? null, st, parsePositionsNeeded(positions_needed), st === 'active' ? 1 : 0, req.params.id
  );
  const job = db.prepare(`${jobsWithMeta} WHERE j.id = ?`).get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// Deleting a job cascades to every application, timesheet, and notification
// tied to it — block it when there's real history (a hire or a billed
// timesheet) that shouldn't just vanish. Close the job instead; delete
// individual not-yet-placed applicants via DELETE /applicants/:id if needed.
router.delete('/jobs/:id', auth, blockViewerWrites, (req, res) => {
  const hired = db.prepare("SELECT COUNT(*) n FROM applications WHERE job_id = ? AND status = 'hired'").get(req.params.id).n;
  const invoiced = db.prepare("SELECT COUNT(*) n FROM timesheets WHERE job_id = ? AND status = 'invoiced'").get(req.params.id).n;
  if (hired > 0 || invoiced > 0) {
    const parts = [];
    if (hired > 0) parts.push(`${hired} hired candidate${hired > 1 ? 's' : ''}`);
    if (invoiced > 0) parts.push(`${invoiced} invoiced timesheet${invoiced > 1 ? 's' : ''}`);
    return res.status(400).json({ error: `This job has ${parts.join(' and ')} — set its status to Closed instead of deleting it, so that history is kept.` });
  }
  const result = db.prepare('DELETE FROM jobs WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Job not found' });
  res.json({ message: 'Job deleted' });
});

// ---------------------------------------------------------------------------
// Notifications — recruiting activity feed, read state is per-user
// ---------------------------------------------------------------------------
router.get('/notifications', auth, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const rows = db.prepare(`
    SELECT n.*, r.read_at
    FROM notifications n
    LEFT JOIN notification_reads r ON r.notification_id = n.id AND r.user_id = ?
    ORDER BY n.created_at DESC LIMIT ?
  `).all(req.user.id, limit);
  const unread = db.prepare(`
    SELECT COUNT(*) n FROM notifications n
    LEFT JOIN notification_reads r ON r.notification_id = n.id AND r.user_id = ?
    WHERE r.read_at IS NULL
  `).get(req.user.id).n;
  res.json({ notifications: rows.map((r) => ({ ...r, read: r.read_at != null })), unread_count: unread });
});

router.post('/notifications/:id/read', auth, (req, res) => {
  const exists = db.prepare('SELECT id FROM notifications WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Notification not found' });
  db.prepare(
    'INSERT INTO notification_reads (notification_id, user_id) VALUES (?, ?) ON CONFLICT(notification_id, user_id) DO NOTHING'
  ).run(req.params.id, req.user.id);
  res.json({ message: 'Marked read' });
});

router.post('/notifications/read-all', auth, (req, res) => {
  db.prepare(`
    INSERT INTO notification_reads (notification_id, user_id)
    SELECT id, ? FROM notifications
    WHERE id NOT IN (SELECT notification_id FROM notification_reads WHERE user_id = ?)
  `).run(req.user.id, req.user.id);
  res.json({ message: 'All marked read' });
});

// ---------------------------------------------------------------------------
// Applicants (pipeline) — list, status change, AI re-score, résumé download
// ---------------------------------------------------------------------------
const APPLICANT_STATUSES = ['new', 'reviewing', 'interviewing', 'hired', 'rejected'];

router.get('/applicants', auth, blockViewerWrites, (req, res) => {
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

router.patch('/applicants/:id', auth, blockViewerWrites, (req, res) => {
  const { status } = req.body;
  if (status && !APPLICANT_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const existing = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Applicant not found' });

  if (status) {
    db.prepare("UPDATE applications SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .run(status, req.params.id);

    // Fire recruiting notifications on a genuine new-hire transition only —
    // guards against duplicate notifications on unrelated re-saves where the
    // status was already 'hired'.
    if (status === 'hired' && existing.status !== 'hired') {
      const job = db.prepare('SELECT id, title, positions_needed FROM jobs WHERE id = ?').get(existing.job_id);
      if (job) {
        db.prepare(
          `INSERT INTO notifications (org_id, type, title, body, link, job_id, application_id)
           VALUES (1, 'hired', ?, ?, ?, ?, ?)`
        ).run(
          `${existing.name} was hired`,
          `Hired for ${job.title}`,
          `/admin/applicants?q=${encodeURIComponent(existing.name)}`,
          job.id, existing.id
        );

        // Only notify on the specific hire that crosses the target — not on
        // every hire that happens to land while already at/over target (that
        // would spam an agency that intentionally overstaffs or backfills).
        const filled = db.prepare("SELECT COUNT(*) n FROM applications WHERE job_id = ? AND status = 'hired'").get(job.id).n;
        if (filled - 1 < job.positions_needed && filled >= job.positions_needed) {
          db.prepare(
            `INSERT INTO notifications (org_id, type, title, body, link, job_id)
             VALUES (1, 'job_filled', ?, ?, ?, ?)`
          ).run(
            `${job.title} is fully staffed`,
            `${filled} of ${job.positions_needed} positions filled`,
            `/admin/jobs?q=${encodeURIComponent(job.title)}`,
            job.id
          );
        }
      }
    }
  }
  res.json(db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id));
});

// Trigger (or re-run) AI scoring for one applicant.
router.post('/applicants/:id/score', auth, blockViewerWrites, async (req, res) => {
  if (!aiScoringEnabled()) {
    return res.status(503).json({ error: 'AI scoring unavailable — set LLM_API_KEY' });
  }
  const exists = db.prepare('SELECT id FROM applications WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Applicant not found' });

  const result = await scoreApplicationById(db, Number(req.params.id));
  if (!result) return res.status(404).json({ error: 'Could not score applicant' });
  if (result.error) return res.status(502).json({ error: result.error });
  res.json(result);
});

router.get('/applicants/:id/resume', auth, blockViewerWrites, (req, res) => {
  const app = db.prepare('SELECT resume_path FROM applications WHERE id = ?').get(req.params.id);
  if (!app || !app.resume_path) return res.status(404).json({ error: 'Résumé not found' });

  const resumeDir = process.env.NODE_ENV === 'production'
    ? '/app/persist/resumes'
    : join(__dirname, '..', '..', 'uploads', 'resumes');
  res.download(join(resumeDir, app.resume_path));
});

// Removes a candidate (e.g. a right-to-be-forgotten request) and their résumé
// file on disk. Blocked if they have any invoiced timesheets — deleting the
// application would cascade-delete those rows too, silently erasing billed
// history; close them out in Timesheets/Billing first if that's really needed.
router.delete('/applicants/:id', auth, blockViewerWrites, (req, res) => {
  const app = db.prepare('SELECT resume_path FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Applicant not found' });

  const invoiced = db.prepare("SELECT COUNT(*) n FROM timesheets WHERE application_id = ? AND status = 'invoiced'").get(req.params.id).n;
  if (invoiced > 0) {
    return res.status(400).json({ error: `This candidate has ${invoiced} invoiced timesheet${invoiced > 1 ? 's' : ''} — remove them from Billing first if you really need to delete this record.` });
  }

  db.prepare('DELETE FROM applications WHERE id = ?').run(req.params.id);

  if (app.resume_path) {
    const resumeDir = process.env.NODE_ENV === 'production'
      ? '/app/persist/resumes'
      : join(__dirname, '..', '..', 'uploads', 'resumes');
    try { unlinkSync(join(resumeDir, app.resume_path)); } catch { /* file already gone — nothing to clean up */ }
  }

  res.json({ message: 'Applicant deleted' });
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

router.get('/employers', auth, blockViewerWrites, (req, res) => {
  res.json(db.prepare(`${employersWithMeta} ORDER BY e.name`).all());
});

router.post('/employers', auth, blockViewerWrites, (req, res) => {
  const { name, contact_name, contact_email, phone, plan, since, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Company name is required' });
  const result = db.prepare(
    `INSERT INTO employers (org_id, name, contact_name, contact_email, phone, plan, since, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(ORG_ID, name, contact_name || '', contact_email || '', phone || '', plan || 'Trial', since || null, notes || '');
  res.status(201).json(db.prepare(`${employersWithMeta} WHERE e.id = ?`).get(result.lastInsertRowid));
});

router.put('/employers/:id', auth, blockViewerWrites, (req, res) => {
  const { name, contact_name, contact_email, phone, plan, since, notes } = req.body;
  db.prepare(
    `UPDATE employers SET name = ?, contact_name = ?, contact_email = ?, phone = ?, plan = ?, since = ?, notes = ? WHERE id = ?`
  ).run(name, contact_name || '', contact_email || '', phone || '', plan || 'Trial', since || null, notes || '', req.params.id);
  const employer = db.prepare(`${employersWithMeta} WHERE e.id = ?`).get(req.params.id);
  if (!employer) return res.status(404).json({ error: 'Employer not found' });
  res.json(employer);
});

// Deleting an employer cascades to every invoice billed to them — block it
// when any exist (including drafts, which still represent real billing work)
// rather than silently erasing financial history the agency needs at tax time.
router.delete('/employers/:id', auth, blockViewerWrites, (req, res) => {
  const invoiceCount = db.prepare('SELECT COUNT(*) n FROM invoices WHERE employer_id = ?').get(req.params.id).n;
  if (invoiceCount > 0) {
    return res.status(400).json({ error: `This employer has ${invoiceCount} invoice${invoiceCount > 1 ? 's' : ''} on file — invoices can't be deleted along with the employer. Remove them from Billing first if you really need to delete this record.` });
  }
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

router.get('/invoices', auth, requireRole('owner'), (req, res) => {
  res.json(db.prepare(`${invoicesWithMeta} ORDER BY i.created_at DESC`).all());
});

// Auto-numbering is derived from the AUTOINCREMENT id (never reused, even after
// deletes) instead of COUNT(*), which can hand out a number that already exists
// once an earlier invoice has been deleted.
const insertInvoiceStmt = db.prepare(
  `INSERT INTO invoices (org_id, employer_id, number, amount, status, issued_at, due_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const setInvoiceNumberStmt = db.prepare('UPDATE invoices SET number = ? WHERE id = ?');
const createInvoiceTx = db.transaction((employer_id, number, amount, status, issued_at, due_at) => {
  const result = insertInvoiceStmt.run(ORG_ID, employer_id, number || null, amount, status, issued_at, due_at);
  const id = result.lastInsertRowid;
  if (!number) setInvoiceNumberStmt.run(`INV-${1000 + id}`, id);
  return id;
});

router.post('/invoices', auth, requireRole('owner'), (req, res) => {
  const { employer_id, number, amount, status, issued_at, due_at } = req.body;
  if (!employer_id) return res.status(400).json({ error: 'Employer is required' });
  const st = INVOICE_STATUSES.includes(status) ? status : 'draft';
  const id = createInvoiceTx(employer_id, number || null, Number(amount) || 0, st, issued_at || null, due_at || null);
  res.status(201).json(db.prepare(`${invoicesWithMeta} WHERE i.id = ?`).get(id));
});

router.put('/invoices/:id', auth, requireRole('owner'), (req, res) => {
  const { employer_id, number, amount, status, issued_at, due_at } = req.body;
  const st = INVOICE_STATUSES.includes(status) ? status : 'draft';
  db.prepare(
    `UPDATE invoices SET employer_id = ?, number = ?, amount = ?, status = ?, issued_at = ?, due_at = ? WHERE id = ?`
  ).run(employer_id, number, Number(amount) || 0, st, issued_at || null, due_at || null, req.params.id);
  const invoice = db.prepare(`${invoicesWithMeta} WHERE i.id = ?`).get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json(invoice);
});

router.delete('/invoices/:id', auth, requireRole('owner'), (req, res) => {
  const result = db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ message: 'Invoice deleted' });
});

// ---------------------------------------------------------------------------
// Documents — résumés on file (derived from applications)
// ---------------------------------------------------------------------------
router.get('/documents', auth, blockViewerWrites, (req, res) => {
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
router.get('/settings', auth, requireRole('owner'), (req, res) => {
  const org = db.prepare('SELECT id, name, settings FROM organizations WHERE id = ?').get(ORG_ID);
  res.json({
    id: org.id, name: org.name, settings: safeParse(org.settings) || {},
    aiScoring: aiScoringEnabled(),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID),
    stripeWebhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    subscription: getStripeSubscription(),
  });
});

router.put('/settings', auth, requireRole('owner'), (req, res) => {
  const { name, settings } = req.body;
  db.prepare('UPDATE organizations SET name = COALESCE(?, name), settings = ? WHERE id = ?')
    .run(name || null, JSON.stringify(settings || {}), ORG_ID);
  const org = db.prepare('SELECT id, name, settings FROM organizations WHERE id = ?').get(ORG_ID);
  res.json({ id: org.id, name: org.name, settings: safeParse(org.settings) || {} });
});

function orgSettings() {
  const org = db.prepare('SELECT settings FROM organizations WHERE id = ?').get(ORG_ID);
  return safeParse(org?.settings) || {};
}

// ---------------------------------------------------------------------------
// AI daily shortlist — top-5 candidates by AI score (the "Reviewer" output)
// ---------------------------------------------------------------------------
router.get('/shortlist', auth, blockViewerWrites, (req, res) => {
  res.json(db.prepare(`
    SELECT a.id, a.name, a.email, a.ai_score, a.status, a.created_at,
           j.title AS job_title, e.name AS company
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    LEFT JOIN employers e ON j.employer_id = e.id
    WHERE a.ai_score IS NOT NULL AND a.status IN ('new','reviewing')
    ORDER BY a.ai_score DESC, a.created_at DESC
    LIMIT 5
  `).all());
});

// ---------------------------------------------------------------------------
// AI Agents — Reviewer, Follow-up, Receptionist, Voice, Onboarder
// ---------------------------------------------------------------------------
router.get('/agents', auth, blockViewerWrites, (req, res) => {
  const ai = aiScoringEnabled();
  const scored = db.prepare('SELECT COUNT(*) n FROM applications WHERE ai_score IS NOT NULL').get().n;
  const avg = db.prepare('SELECT ROUND(AVG(ai_score)) a FROM applications WHERE ai_score IS NOT NULL').get().a;
  const s = orgSettings();
  res.json([
    { key: 'reviewer', name: 'The Reviewer', icon: 'solar:star-fall-2-bold-duotone',
      desc: 'Screens every inbound résumé against the job and scores fit 0–100 with reasons.',
      status: ai ? 'active' : 'setup', metric: ai ? `${scored} screened · avg ${avg || 0}` : 'Add LLM_API_KEY' },
    { key: 'followup', name: 'The Follow-up', icon: 'solar:chat-round-line-bold-duotone',
      desc: 'Drafts warm, personalized follow-up messages to keep candidates engaged.',
      status: ai ? 'active' : 'setup', metric: ai ? 'Ready to draft' : 'Add LLM_API_KEY', action: 'draft' },
    { key: 'receptionist', name: 'The Receptionist', icon: 'solar:phone-calling-rounded-bold-duotone',
      desc: 'Answers inbound calls & chats 24/7 and captures applicants into the pipeline.',
      status: s.phone_provider ? 'active' : 'connect', metric: s.phone_provider || 'Connect a phone number' },
    { key: 'voice', name: 'The Voice', icon: 'solar:microphone-large-bold-duotone',
      desc: 'Outbound voice AI that pre-screens candidates and books interviews.',
      status: s.voice_provider ? 'active' : 'connect', metric: s.voice_provider || 'Connect a voice provider' },
    { key: 'onboarder', name: 'The Onboarder', icon: 'solar:user-id-bold-duotone',
      desc: 'Runs new hires through your onboarding checklist and document collection.',
      status: 'setup', metric: 'Coming soon' },
  ]);
});

router.post('/agents/followup', auth, blockViewerWrites, async (req, res) => {
  if (!aiScoringEnabled()) return res.status(503).json({ error: 'Connect LLM_API_KEY to use AI agents' });
  const a = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.body.applicant_id);
  if (!a) return res.status(404).json({ error: 'Applicant not found' });
  const j = db.prepare('SELECT * FROM jobs WHERE id = ?').get(a.job_id);
  const message = await draftFollowUp({ job: j, applicant: a });
  if (!message) return res.status(502).json({ error: 'Could not draft message' });
  res.json({ message });
});

// ---------------------------------------------------------------------------
// ATS routing — push a candidate to the configured ATS webhook (Bullhorn, …)
// ---------------------------------------------------------------------------
router.post('/applicants/:id/route', auth, blockViewerWrites, async (req, res) => {
  const a = db.prepare(`
    SELECT a.*, j.title AS job_title FROM applications a JOIN jobs j ON a.job_id = j.id WHERE a.id = ?
  `).get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Applicant not found' });

  const s = orgSettings();
  const provider = s.ats_provider || 'ATS';
  const payload = {
    name: a.name, email: a.email, phone: a.phone, job: a.job_title,
    status: a.status, ai_score: a.ai_score, ai_reasons: safeParse(a.ai_reasons) || [],
    source: 'Staffing Co.',
  };

  if (s.ats_webhook) {
    try {
      const r = await fetch(s.ats_webhook, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      return res.json({ routed: true, provider, httpStatus: r.status });
    } catch (err) {
      return res.status(502).json({ error: `Failed to reach ${provider}: ${err.message}` });
    }
  }
  // No live webhook configured → return the export-ready payload.
  res.json({ routed: false, provider, payload });
});

// ---------------------------------------------------------------------------
// Stripe subscription ($950/mo) — real Checkout when keys are configured
// ---------------------------------------------------------------------------
router.post('/billing/checkout', auth, requireRole('owner'), async (req, res) => {
  const key = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_ID;
  if (!key || !price) {
    return res.status(503).json({ error: 'Connect Stripe (STRIPE_SECRET_KEY + STRIPE_PRICE_ID) to enable subscriptions' });
  }
  const origin = req.headers.origin || '';
  const form = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    success_url: `${origin}/admin/settings?sub=success`,
    cancel_url: `${origin}/admin/settings`,
  });
  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: data.error?.message || 'Stripe error' });
    res.json({ url: data.url });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// QuickBooks Online — connect (OAuth), status, disconnect, push invoice, export
// ---------------------------------------------------------------------------
router.get('/quickbooks/status', auth, requireRole('owner'), (req, res) => {
  const qbo = getQbo(db);
  res.json({ configured: qboConfigured(), connected: Boolean(qbo), company: qbo?.company_name || null, connectedAt: qbo?.connected_at || null });
});

router.get('/quickbooks/connect', auth, requireRole('owner'), (req, res) => {
  if (!qboConfigured()) return res.status(503).json({ error: 'QuickBooks not configured — set QBO_CLIENT_ID and QBO_CLIENT_SECRET' });
  const state = crypto.randomBytes(16).toString('hex');
  savePendingState(db, state);
  res.json({ url: buildAuthUrl(req, state) });
});

router.post('/quickbooks/disconnect', auth, requireRole('owner'), (req, res) => {
  clearQbo(db);
  res.json({ disconnected: true });
});

router.post('/invoices/:id/quickbooks', auth, requireRole('owner'), async (req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (!getQbo(db)) return res.status(503).json({ error: 'Connect QuickBooks in Settings first' });

  // Idempotency: this invoice was already pushed — don't create a duplicate in
  // QuickBooks. Pass ?force=1 to intentionally re-push (e.g. after a manual delete on the QBO side).
  if (invoice.qbo_invoice_id && req.query.force !== '1') {
    return res.json({ synced: true, alreadySynced: true, qbo_id: invoice.qbo_invoice_id, doc_number: invoice.number });
  }

  const employer = invoice.employer_id ? db.prepare('SELECT * FROM employers WHERE id = ?').get(invoice.employer_id) : null;
  try {
    const qbInv = await pushInvoice(db, invoice, employer);
    db.prepare("UPDATE invoices SET qbo_invoice_id = ?, qbo_synced_at = datetime('now') WHERE id = ?")
      .run(qbInv.Id, invoice.id);
    res.json({ synced: true, qbo_id: qbInv.Id, doc_number: qbInv.DocNumber });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// QuickBooks-ready CSV export of all invoices (works with no QBO connection).
router.get('/invoices/export', auth, requireRole('owner'), (req, res) => {
  const rows = db.prepare(`${invoicesWithMeta} ORDER BY i.created_at DESC`).all();
  const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const header = ['InvoiceNo', 'Customer', 'InvoiceDate', 'DueDate', 'Item', 'ItemDescription', 'ItemQuantity', 'ItemRate', 'ItemAmount', 'Status'];
  const lines = [header.join(',')];
  for (const v of rows) {
    lines.push([
      v.number, v.company || '', v.issued_at || '', v.due_at || '',
      'Staffing Services', `Staffing services ${v.number || ''}`.trim(), 1, v.amount, v.amount, v.status,
    ].map(esc).join(','));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="invoices-quickbooks.csv"');
  res.send(lines.join('\n'));
});

// ---------------------------------------------------------------------------
// Timesheets — the differentiator most ATS platforms at this price tier lack.
// Candidates submit hours via a no-login link (see routes/timesheetPublic.js);
// the agency approves here, then either exports for payroll or batch-generates
// client invoices straight from approved hours using each job's bill_rate.
// ---------------------------------------------------------------------------
const TIMESHEET_STATUSES = ['submitted', 'approved', 'rejected', 'invoiced'];
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function sumDailyHours(daily) {
  return DAYS.reduce((t, d) => t + (Number(daily?.[d]) || 0), 0);
}
function csvEscape(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const timesheetsWithMeta = `
  SELECT t.*, a.name AS candidate_name, a.email AS candidate_email,
         j.title AS job_title, j.rate, j.bill_rate,
         e.id AS employer_id, e.name AS company
  FROM timesheets t
  JOIN applications a ON t.application_id = a.id
  JOIN jobs j ON t.job_id = j.id
  LEFT JOIN employers e ON j.employer_id = e.id
`;
function withAmounts(row) {
  const daily_hours = safeParse(row.daily_hours) || {};
  const pay_amount = row.rate != null ? Math.round(row.hours * row.rate * 100) / 100 : null;
  const bill_amount = row.bill_rate != null ? Math.round(row.hours * row.bill_rate * 100) / 100 : null;
  return { ...row, daily_hours, pay_amount, bill_amount };
}

router.get('/timesheets', auth, blockViewerWrites, (req, res) => {
  const { status } = req.query;
  let sql = timesheetsWithMeta;
  const args = [];
  if (status && TIMESHEET_STATUSES.includes(status)) { sql += ' WHERE t.status = ?'; args.push(status); }
  sql += ' ORDER BY t.week_start DESC, t.submitted_at DESC';
  res.json(db.prepare(sql).all(...args).map(withAmounts));
});

// Manual entry (e.g. hours phoned in by the client) — upserts the week if the
// candidate already self-submitted it and it's still pending review.
router.post('/timesheets', auth, blockViewerWrites, (req, res) => {
  const { application_id, week_start, daily_hours, notes } = req.body;
  if (!application_id || !week_start) return res.status(400).json({ error: 'Candidate and week are required' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week_start) || Number.isNaN(Date.parse(week_start))) {
    return res.status(400).json({ error: 'Enter a valid week date (YYYY-MM-DD)' });
  }

  const app = db.prepare('SELECT id, job_id FROM applications WHERE id = ?').get(application_id);
  if (!app) return res.status(404).json({ error: 'Applicant not found' });

  const hours = sumDailyHours(daily_hours);
  const existing = db.prepare('SELECT id, status FROM timesheets WHERE application_id = ? AND week_start = ?').get(application_id, week_start);
  if (existing && existing.status !== 'submitted') {
    return res.status(409).json({ error: `A ${existing.status} timesheet already exists for this candidate/week — edit it instead of creating a new one.` });
  }

  let id;
  if (existing) {
    db.prepare('UPDATE timesheets SET daily_hours = ?, hours = ?, notes = ? WHERE id = ?')
      .run(JSON.stringify(daily_hours || {}), hours, notes || '', existing.id);
    id = existing.id;
  } else {
    const result = db.prepare(
      `INSERT INTO timesheets (org_id, application_id, job_id, week_start, daily_hours, hours, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted')`
    ).run(ORG_ID, application_id, app.job_id, week_start, JSON.stringify(daily_hours || {}), hours, notes || '');
    id = result.lastInsertRowid;
  }
  res.status(201).json(withAmounts(db.prepare(`${timesheetsWithMeta} WHERE t.id = ?`).get(id)));
});

router.patch('/timesheets/:id', auth, blockViewerWrites, (req, res) => {
  const existing = db.prepare('SELECT * FROM timesheets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Timesheet not found' });

  const { status, daily_hours, notes, reviewed_note } = req.body;
  if (status && !TIMESHEET_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (status === 'invoiced') return res.status(400).json({ error: '"invoiced" is set automatically when generating invoices' });

  const hours = daily_hours ? sumDailyHours(daily_hours) : existing.hours;
  const isReview = status === 'approved' || status === 'rejected';
  db.prepare(
    `UPDATE timesheets SET
       status = COALESCE(?, status),
       daily_hours = ?, hours = ?, notes = COALESCE(?, notes),
       reviewed_note = COALESCE(?, reviewed_note),
       reviewed_at = CASE WHEN ? THEN datetime('now') ELSE reviewed_at END
     WHERE id = ?`
  ).run(
    status || null, JSON.stringify(daily_hours || safeParse(existing.daily_hours) || {}), hours,
    notes ?? null, reviewed_note ?? null, isReview ? 1 : 0, req.params.id
  );
  res.json(withAmounts(db.prepare(`${timesheetsWithMeta} WHERE t.id = ?`).get(req.params.id)));
});

router.delete('/timesheets/:id', auth, blockViewerWrites, (req, res) => {
  const result = db.prepare('DELETE FROM timesheets WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Timesheet not found' });
  res.json({ message: 'Timesheet deleted' });
});

// Get-or-create the no-login link a hired candidate uses to submit their hours.
router.get('/applicants/:id/timesheet-link', auth, blockViewerWrites, (req, res) => {
  const app = db.prepare('SELECT id, timesheet_token FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Applicant not found' });

  let token = app.timesheet_token;
  if (!token) {
    token = crypto.randomBytes(20).toString('hex');
    db.prepare('UPDATE applications SET timesheet_token = ? WHERE id = ?').run(token, app.id);
  }
  const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
  res.json({ token, url: `${origin}/timesheet/${token}` });
});

// Payroll-ready CSV export (generic format accepted by ADP/Gusto/Paychex-style imports).
router.get('/timesheets/payroll-export', auth, blockViewerWrites, (req, res) => {
  const status = TIMESHEET_STATUSES.includes(req.query.status) ? req.query.status : 'approved';
  const rows = db.prepare(`${timesheetsWithMeta} WHERE t.status = ? ORDER BY t.week_start DESC`).all(status).map(withAmounts);
  const header = ['Employee Name', 'Employee Email', 'Week Starting', 'Job', 'Client', 'Hours', 'Pay Rate', 'Gross Pay', 'Status'];
  const lines = [header.join(',')];
  for (const t of rows) {
    lines.push([
      t.candidate_name, t.candidate_email || '', t.week_start, t.job_title, t.company || '',
      t.hours, t.rate ?? '', t.pay_amount ?? '', t.status,
    ].map(csvEscape).join(','));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="payroll-${status}.csv"`);
  res.send(lines.join('\n'));
});

// Batch-generate one draft invoice per employer from approved, not-yet-invoiced
// timesheets — hours × job.bill_rate, the same margin math already on the Jobs page.
// Owner-gated to match every other invoice-mutating route (this one creates
// invoices too, via createInvoiceTx, so it shouldn't be reachable by recruiters).
// The eligibility read runs inside the same transaction as the writes so the
// whole read-then-mark-invoiced sequence is atomic by construction, not just
// by the accident of better-sqlite3 being synchronous.
router.post('/timesheets/generate-invoices', auth, requireRole('owner'), (req, res) => {
  const { timesheet_ids } = req.body || {};
  const today = new Date().toISOString().slice(0, 10);
  const markInvoiced = db.prepare("UPDATE timesheets SET status = 'invoiced', invoice_id = ? WHERE id = ?");

  const generate = db.transaction(() => {
    let sql = `${timesheetsWithMeta} WHERE t.status = 'approved'`;
    const args = [];
    if (Array.isArray(timesheet_ids) && timesheet_ids.length) {
      sql += ` AND t.id IN (${timesheet_ids.map(() => '?').join(',')})`;
      args.push(...timesheet_ids);
    }
    const eligible = db.prepare(sql).all(...args).map(withAmounts);

    const billable = eligible.filter((t) => t.employer_id && t.bill_amount != null);
    const skipped = eligible.length - billable.length;
    if (billable.length === 0) return { invoices: [], skipped };

    const byEmployer = new Map();
    for (const t of billable) {
      if (!byEmployer.has(t.employer_id)) byEmployer.set(t.employer_id, { company: t.company, total: 0, timesheetIds: [] });
      const bucket = byEmployer.get(t.employer_id);
      bucket.total += t.bill_amount;
      bucket.timesheetIds.push(t.id);
    }

    const created = [];
    for (const [employerId, bucket] of byEmployer) {
      const amount = Math.round(bucket.total * 100) / 100;
      const invoiceId = createInvoiceTx(employerId, null, amount, 'draft', today, null);
      bucket.timesheetIds.forEach((tid) => markInvoiced.run(invoiceId, tid));
      created.push({ invoice_id: invoiceId, employer: bucket.company, amount, timesheet_count: bucket.timesheetIds.length });
    }
    return { invoices: created, skipped };
  });

  const result = generate();
  if (result.invoices.length === 0) {
    return res.status(400).json({ error: 'No approved timesheets with a billable employer + bill rate to invoice.', skipped: result.skipped });
  }
  res.json(result);
});

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

export default router;
