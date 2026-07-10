import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Public routes — deliberately whitelist columns rather than SELECT * so
// agency-confidential fields (pay/bill rate = margin, employer_id, internal
// status) never leak to an anonymous visitor or a competitor scraping the
// board. pay_range is the intentional public-facing display string.
const PUBLIC_JOB_COLUMNS = 'id, title, location, type, pay_range, description, requirements, created_at';

router.get('/', (req, res) => {
  const jobs = db.prepare(
    `SELECT ${PUBLIC_JOB_COLUMNS} FROM jobs WHERE is_active = 1 ORDER BY created_at DESC`
  ).all();
  res.json(jobs);
});

router.get('/:id', (req, res) => {
  const job = db.prepare(`SELECT ${PUBLIC_JOB_COLUMNS} FROM jobs WHERE id = ? AND is_active = 1`).get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

export default router;
