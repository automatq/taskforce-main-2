import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from '../db.js';
import auth from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// Login
router.post('/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  const match = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  if (!match) return res.status(401).json({ error: 'Invalid password' });

  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

// Jobs CRUD
router.get('/jobs', auth, (req, res) => {
  const jobs = db.prepare('SELECT * FROM jobs ORDER BY created_at DESC').all();
  res.json(jobs);
});

router.post('/jobs', auth, (req, res) => {
  const { title, location, type, description, requirements, pay_range, is_active } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Title and description are required' });

  const result = db.prepare(
    'INSERT INTO jobs (title, location, type, description, requirements, pay_range, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(title, location || 'Guelph, ON', type || 'Full-Time', description, requirements || '', pay_range || '', is_active ?? 1);

  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(job);
});

router.put('/jobs/:id', auth, (req, res) => {
  const { title, location, type, description, requirements, pay_range, is_active } = req.body;

  db.prepare(
    `UPDATE jobs SET title = ?, location = ?, type = ?, description = ?, requirements = ?, pay_range = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(title, location, type, description, requirements || '', pay_range || '', is_active ?? 1, req.params.id);

  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

router.delete('/jobs/:id', auth, (req, res) => {
  const result = db.prepare('DELETE FROM jobs WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Job not found' });
  res.json({ message: 'Job deleted' });
});

// Applications
router.get('/applications', auth, (req, res) => {
  const { job_id } = req.query;
  let applications;
  if (job_id) {
    applications = db.prepare(
      'SELECT a.*, j.title as job_title FROM applications a JOIN jobs j ON a.job_id = j.id WHERE a.job_id = ? ORDER BY a.created_at DESC'
    ).all(job_id);
  } else {
    applications = db.prepare(
      'SELECT a.*, j.title as job_title FROM applications a JOIN jobs j ON a.job_id = j.id ORDER BY a.created_at DESC'
    ).all();
  }
  res.json(applications);
});

router.get('/applications/:id/resume', auth, (req, res) => {
  const app = db.prepare('SELECT resume_path FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });

  const resumeDir = process.env.NODE_ENV === 'production'
    ? '/app/persist/resumes'
    : join(__dirname, '..', '..', 'uploads', 'resumes');
  const filePath = join(resumeDir, app.resume_path);
  res.download(filePath);
});

export default router;
