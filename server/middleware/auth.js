import jwt from 'jsonwebtoken';
import db from '../db.js';

// Re-fetches the user from the DB on every request instead of trusting the
// JWT payload for role/active state — so deactivating someone or changing
// their role takes effect immediately instead of waiting up to 24h for their
// token to expire.
export default function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare('SELECT id, org_id, name, email, role, active FROM users WHERE id = ?').get(payload.sub);
    if (!user || !user.active) return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to do this' });
    }
    next();
  };
}

// Viewers can read everything but write nothing — cheaper than gating every
// shared route individually with requireRole.
export function blockViewerWrites(req, res, next) {
  if (req.user?.role === 'viewer' && req.method !== 'GET') {
    return res.status(403).json({ error: 'Your account is read-only' });
  }
  next();
}
