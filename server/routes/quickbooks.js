// Public QuickBooks OAuth callback — Intuit redirects the browser here after
// the agency authorizes. No bearer auth (it's a top-level browser GET); we
// verify the CSRF `state` we issued at connect time instead.
import { Router } from 'express';
import db from '../db.js';
import { qboConfigured, exchangeCode, saveQbo, getQbo, checkPendingState, companyInfo } from '../services/quickbooks.js';

const router = Router();

router.get('/callback', async (req, res) => {
  const { code, realmId, state, error } = req.query;
  const back = (q) => res.redirect(`/admin/settings?${q}`);

  if (error) return back('qbo=denied');
  if (!qboConfigured()) return back('qbo=notconfigured');
  if (!checkPendingState(db, state)) return back('qbo=badstate');
  if (!code || !realmId) return back('qbo=error');

  try {
    const tokens = await exchangeCode(req, code);
    saveQbo(db, {
      realm_id: realmId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
      connected_at: new Date().toISOString(),
    });
    // Best-effort: store the company name for display.
    const name = await companyInfo(db);
    if (name) saveQbo(db, { ...getQbo(db), company_name: name });
    return back('qbo=connected');
  } catch (e) {
    console.error('[qbo] callback failed:', e.message);
    return back('qbo=error');
  }
});

export default router;
