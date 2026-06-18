import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import db from './db.js';
import jobsRouter from './routes/jobs.js';
import applyRouter from './routes/apply.js';
import adminRouter from './routes/admin.js';

// ---------------------------------------------------------------------------
// First-boot bootstrap — makes 1-click deploys work with zero manual setup.
//  • JWT_SECRET: generated if absent (ephemeral — set it to persist sessions)
//  • ADMIN_PASSWORD: hashed into ADMIN_PASSWORD_HASH so deployers set a plain
//    password env var instead of generating a bcrypt hash by hand
//  • SEED_ON_BOOT: seed demo data on an empty database (default on; 'false' off)
// ---------------------------------------------------------------------------
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('[bootstrap] JWT_SECRET not set — generated an ephemeral secret (logins reset on restart). Set JWT_SECRET to persist sessions.');
}
if (!process.env.ADMIN_PASSWORD_HASH && process.env.ADMIN_PASSWORD) {
  process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
  console.log('[bootstrap] Derived admin password hash from ADMIN_PASSWORD.');
}
if (!process.env.ADMIN_PASSWORD_HASH) {
  console.warn('[bootstrap] No ADMIN_PASSWORD / ADMIN_PASSWORD_HASH set — admin login is disabled until one is provided.');
}
try {
  const jobCount = db.prepare('SELECT COUNT(*) AS n FROM jobs').get().n;
  if (jobCount === 0 && process.env.SEED_ON_BOOT !== 'false') {
    console.log('[bootstrap] Empty database — seeding demo data…');
    await import('./seed.js');
  }
} catch (err) {
  console.error('[bootstrap] seed check failed:', err.message);
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/jobs', jobsRouter);
app.use('/api/jobs', applyRouter);
app.use('/api/admin', adminRouter);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
