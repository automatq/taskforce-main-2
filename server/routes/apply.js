import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { mkdirSync } from 'fs';
import db from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const resumeDir = process.env.NODE_ENV === 'production'
  ? '/app/persist/resumes'
  : join(__dirname, '..', '..', 'uploads', 'resumes');

mkdirSync(resumeDir, { recursive: true });

const storage = multer.diskStorage({
  destination: resumeDir,
  filename: (req, file, cb) => {
    const ext = extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  }
});

const router = Router();

router.post('/:id/apply', upload.single('resume'), (req, res) => {
  const { name, phone } = req.body;
  const jobId = req.params.id;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Resume file is required' });
  }

  const job = db.prepare('SELECT id FROM jobs WHERE id = ? AND is_active = 1').get(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  db.prepare(
    'INSERT INTO applications (job_id, name, phone, resume_path) VALUES (?, ?, ?, ?)'
  ).run(jobId, name, phone, req.file.filename);

  res.status(201).json({ message: 'Application submitted successfully' });
});

export default router;
