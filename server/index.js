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
import quickbooksRouter from './routes/quickbooks.js';
import stripeRouter from './routes/stripe.js';
import timesheetPublicRouter from './routes/timesheetPublic.js';

// ---------------------------------------------------------------------------
// First-boot bootstrap — makes 1-click deploys work with zero manual setup.
//  • JWT_SECRET: generated if absent (ephemeral — set it to persist sessions)
//  • First Owner account: created from ADMIN_EMAIL/ADMIN_PASSWORD the *first*
//    time the server boots against an empty users table only — later changes
//    to those env vars never retroactively touch an existing account, so
//    redeploying doesn't silently reset anyone's password.
//  • SEED_ON_BOOT: seed demo data on an empty database (default on; 'false' off)
// ---------------------------------------------------------------------------
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('[bootstrap] JWT_SECRET not set — generated an ephemeral secret (logins reset on restart). Set JWT_SECRET to persist sessions.');
}
try {
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (userCount === 0) {
    if (process.env.ADMIN_PASSWORD) {
      const email = (process.env.ADMIN_EMAIL || 'owner@staffing.local').trim().toLowerCase();
      const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
      db.prepare(`INSERT INTO users (org_id, name, email, password_hash, role) VALUES (1, 'Owner', ?, ?, 'owner')`).run(email, hash);
      console.log(`[bootstrap] Created first Owner account: ${email}`);
    } else {
      console.warn('[bootstrap] No ADMIN_PASSWORD set — no Owner account created. Admin login is disabled until one is provided.');
    }
  }
} catch (err) {
  console.error('[bootstrap] user bootstrap failed:', err.message);
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

// Render/Railway/etc. sit in front of this app behind exactly one reverse-proxy
// hop — trust it so req.ip (used by rate limiting) reflects the real client,
// not the proxy. A bare `true` would trust the whole X-Forwarded-For chain,
// which is spoofable; `1` trusts only the immediate hop.
app.set('trust proxy', 1);

app.use(cors());

// Stripe's webhook signature is computed over the exact raw request bytes, so
// this route must see the unparsed body — mount it with express.raw() before
// the global express.json() touches the request.
app.use('/api/stripe', express.raw({ type: 'application/json' }), stripeRouter);

app.use(express.json());

// API routes
app.use('/api/jobs', jobsRouter);
app.use('/api/jobs', applyRouter);
app.use('/api/admin', adminRouter);
app.use('/api/quickbooks', quickbooksRouter); // public OAuth callback
app.use('/api/timesheet', timesheetPublicRouter); // public, token-authenticated (no login)

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
