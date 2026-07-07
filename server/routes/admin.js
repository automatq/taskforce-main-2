import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from '../db.js';
import auth from '../middleware/auth.js';
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
// Throttle brute-force attempts against the single shared admin password.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in a few minutes.' },
});

router.post('/login', loginLimiter, async (req, res) => {
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
    return res.status(503).json({ error: 'AI scoring unavailable — set LLM_API_KEY' });
  }
  const exists = db.prepare('SELECT id FROM applications WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Applicant not found' });

  const result = await scoreApplicationById(db, Number(req.params.id));
  if (!result) return res.status(404).json({ error: 'Could not score applicant' });
  if (result.error) return res.status(502).json({ error: result.error });
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

router.post('/invoices', auth, (req, res) => {
  const { employer_id, number, amount, status, issued_at, due_at } = req.body;
  if (!employer_id) return res.status(400).json({ error: 'Employer is required' });
  const st = INVOICE_STATUSES.includes(status) ? status : 'draft';
  const id = createInvoiceTx(employer_id, number || null, Number(amount) || 0, st, issued_at || null, due_at || null);
  res.status(201).json(db.prepare(`${invoicesWithMeta} WHERE i.id = ?`).get(id));
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
  res.json({
    id: org.id, name: org.name, settings: safeParse(org.settings) || {},
    aiScoring: aiScoringEnabled(),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID),
    stripeWebhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    subscription: getStripeSubscription(),
  });
});

router.put('/settings', auth, (req, res) => {
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
router.get('/shortlist', auth, (req, res) => {
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
router.get('/agents', auth, (req, res) => {
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
      status: 'active', metric: 'Checklist ready' },
  ]);
});

router.post('/agents/followup', auth, async (req, res) => {
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
router.post('/applicants/:id/route', auth, async (req, res) => {
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
router.post('/billing/checkout', auth, async (req, res) => {
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
router.get('/quickbooks/status', auth, (req, res) => {
  const qbo = getQbo(db);
  res.json({ configured: qboConfigured(), connected: Boolean(qbo), company: qbo?.company_name || null, connectedAt: qbo?.connected_at || null });
});

router.get('/quickbooks/connect', auth, (req, res) => {
  if (!qboConfigured()) return res.status(503).json({ error: 'QuickBooks not configured — set QBO_CLIENT_ID and QBO_CLIENT_SECRET' });
  const state = crypto.randomBytes(16).toString('hex');
  savePendingState(db, state);
  res.json({ url: buildAuthUrl(req, state) });
});

router.post('/quickbooks/disconnect', auth, (req, res) => {
  clearQbo(db);
  res.json({ disconnected: true });
});

router.post('/invoices/:id/quickbooks', auth, async (req, res) => {
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
router.get('/invoices/export', auth, (req, res) => {
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

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

export default router;
