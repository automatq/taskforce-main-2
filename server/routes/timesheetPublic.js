// Public, no-login timesheet submission — the same trust model as the public
// job-apply flow (routes/apply.js): a hard-to-guess token stands in for auth,
// so a placed candidate can log hours from their phone without an account.
import { Router } from 'express';
import db from '../db.js';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
function sumDailyHours(daily) {
  return DAYS.reduce((t, d) => t + (Number(daily?.[d]) || 0), 0);
}
function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

const router = Router();

function loadContext(token) {
  const app = db.prepare(`
    SELECT a.id, a.name, a.email, a.status, j.id AS job_id, j.title AS job_title, e.name AS company
    FROM applications a JOIN jobs j ON a.job_id = j.id LEFT JOIN employers e ON j.employer_id = e.id
    WHERE a.timesheet_token = ?
  `).get(token);
  return app;
}

router.get('/:token', (req, res) => {
  const app = loadContext(req.params.token);
  if (!app) return res.status(404).json({ error: 'Link not found or expired' });

  const history = db.prepare(`
    SELECT week_start, daily_hours, hours, status, submitted_at
    FROM timesheets WHERE application_id = ? ORDER BY week_start DESC LIMIT 12
  `).all(app.id).map((t) => ({ ...t, daily_hours: safeParse(t.daily_hours) || {} }));

  res.json({
    candidate: { name: app.name, email: app.email },
    job: { title: app.job_title, company: app.company },
    history,
  });
});

router.post('/:token', (req, res) => {
  const app = loadContext(req.params.token);
  if (!app) return res.status(404).json({ error: 'Link not found or expired' });

  const { week_start, daily_hours, notes } = req.body;
  if (!week_start || !/^\d{4}-\d{2}-\d{2}$/.test(week_start) || Number.isNaN(Date.parse(week_start))) {
    return res.status(400).json({ error: 'Enter a valid week date (YYYY-MM-DD)' });
  }
  const hours = sumDailyHours(daily_hours);
  if (hours <= 0) return res.status(400).json({ error: 'Enter at least some hours before submitting' });
  if (hours > 24 * 7) return res.status(400).json({ error: 'That’s more hours than exist in a week — please check your entries' });

  const existing = db.prepare('SELECT id, status FROM timesheets WHERE application_id = ? AND week_start = ?').get(app.id, week_start);
  if (existing && existing.status !== 'submitted') {
    return res.status(409).json({ error: `Your timesheet for that week was already ${existing.status} — contact your recruiter to make changes.` });
  }

  if (existing) {
    db.prepare("UPDATE timesheets SET daily_hours = ?, hours = ?, notes = ?, submitted_at = datetime('now') WHERE id = ?")
      .run(JSON.stringify(daily_hours || {}), hours, notes || '', existing.id);
  } else {
    db.prepare(
      `INSERT INTO timesheets (org_id, application_id, job_id, week_start, daily_hours, hours, notes, status)
       VALUES (1, ?, ?, ?, ?, ?, ?, 'submitted')`
    ).run(app.id, app.job_id, week_start, JSON.stringify(daily_hours || {}), hours, notes || '');
  }

  res.status(201).json({ message: 'Timesheet submitted', hours });
});

export default router;
