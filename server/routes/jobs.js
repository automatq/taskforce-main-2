import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const jobs = db.prepare(
    'SELECT id, title, location, type, pay_range, rate, created_at FROM jobs WHERE is_active = 1 ORDER BY created_at DESC'
  ).all();
  res.json(jobs);
});

router.get('/:id', (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

export default router;
