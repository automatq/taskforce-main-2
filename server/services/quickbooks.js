// QuickBooks Online integration — OAuth 2.0 + Accounting API (invoice sync).
// Configure with env: QBO_CLIENT_ID, QBO_CLIENT_SECRET, QBO_ENV (sandbox|production),
// and QBO_REDIRECT_URI (must match the redirect URI registered on your Intuit app).
// Tokens are stored per-org in organizations.integrations (system-managed).
const ORG_ID = 1;
const PROD = process.env.QBO_ENV === 'production';
const API_BASE = PROD ? 'https://quickbooks.api.intuit.com' : 'https://sandbox-quickbooks.api.intuit.com';
const AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const SCOPE = 'com.intuit.quickbooks.accounting';
const MINOR = '75';

export function qboConfigured() {
  return Boolean(process.env.QBO_CLIENT_ID && process.env.QBO_CLIENT_SECRET);
}

export function redirectUri(req) {
  if (process.env.QBO_REDIRECT_URI) return process.env.QBO_REDIRECT_URI;
  const host = req?.get?.('host');
  const proto = req?.headers?.['x-forwarded-proto'] || req?.protocol || 'http';
  return host ? `${proto}://${host}/api/quickbooks/callback` : '/api/quickbooks/callback';
}

// --- integration token storage (organizations.integrations JSON) -------------
function readIntegrations(db) {
  const row = db.prepare('SELECT integrations FROM organizations WHERE id = ?').get(ORG_ID);
  try { return JSON.parse(row?.integrations || '{}'); } catch { return {}; }
}
function writeIntegrations(db, obj) {
  db.prepare('UPDATE organizations SET integrations = ? WHERE id = ?').run(JSON.stringify(obj), ORG_ID);
}
export function getQbo(db) { return readIntegrations(db).quickbooks || null; }
export function saveQbo(db, qbo) { const i = readIntegrations(db); i.quickbooks = qbo; writeIntegrations(db, i); }
export function clearQbo(db) { const i = readIntegrations(db); delete i.quickbooks; delete i.qbo_state; writeIntegrations(db, i); }
export function savePendingState(db, state) { const i = readIntegrations(db); i.qbo_state = state; writeIntegrations(db, i); }
export function checkPendingState(db, state) { return state && readIntegrations(db).qbo_state === state; }

// --- OAuth -------------------------------------------------------------------
export function buildAuthUrl(req, state) {
  const p = new URLSearchParams({
    client_id: process.env.QBO_CLIENT_ID,
    response_type: 'code',
    scope: SCOPE,
    redirect_uri: redirectUri(req),
    state,
  });
  return `${AUTH_URL}?${p.toString()}`;
}

function basicAuth() {
  return Buffer.from(`${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`).toString('base64');
}

export async function exchangeCode(req, code) {
  const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(req) });
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${basicAuth()}`, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  if (!r.ok) throw new Error(`token exchange ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

async function refresh(db, qbo) {
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: qbo.refresh_token });
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${basicAuth()}`, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  if (!r.ok) throw new Error(`token refresh ${r.status}`);
  const data = await r.json();
  const updated = {
    ...qbo,
    access_token: data.access_token,
    refresh_token: data.refresh_token || qbo.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  saveQbo(db, updated);
  return updated;
}

async function validToken(db) {
  let qbo = getQbo(db);
  if (!qbo) throw new Error('QuickBooks is not connected');
  if (!qbo.expires_at || Date.now() > qbo.expires_at - 60_000) qbo = await refresh(db, qbo);
  return qbo;
}

// --- Accounting API ----------------------------------------------------------
async function api(db, path, { method = 'GET', body } = {}) {
  const qbo = await validToken(db);
  const sep = path.includes('?') ? '&' : '?';
  const url = `${API_BASE}/v3/company/${qbo.realm_id}${path}${sep}minorversion=${MINOR}`;
  const r = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${qbo.access_token}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.Fault?.Error?.[0]?.Message || `QuickBooks API ${r.status}`);
  return data;
}

async function query(db, q) {
  const data = await api(db, `/query?query=${encodeURIComponent(q)}`);
  return data.QueryResponse || {};
}

// QBO's query language escapes literals with a backslash (backslash and single
// quote are the only special characters) — NOT by stripping characters, which
// would silently corrupt legitimate names like "O'Brien Staffing".
// https://developer.intuit.com/app/developer/qbo/docs/learn/explore-the-quickbooks-online-api/data-queries
function qboEscape(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function findOrCreateCustomer(db, name, email) {
  const safe = qboEscape(name);
  const qr = await query(db, `select * from Customer where DisplayName = '${safe}'`);
  if (qr.Customer?.[0]) return qr.Customer[0];
  const created = await api(db, '/customer', {
    method: 'POST',
    body: { DisplayName: name, ...(email ? { PrimaryEmailAddr: { Address: email } } : {}) },
  });
  return created.Customer;
}

async function defaultItemRef(db) {
  const qr = await query(db, "select * from Item where Type = 'Service' maxresults 1");
  if (qr.Item?.[0]) return { value: qr.Item[0].Id };
  const acc = await query(db, "select * from Account where AccountType = 'Income' maxresults 1");
  const incomeRef = acc.Account?.[0] ? { value: acc.Account[0].Id } : undefined;
  const created = await api(db, '/item', {
    method: 'POST',
    body: { Name: 'Staffing Services', Type: 'Service', ...(incomeRef ? { IncomeAccountRef: incomeRef } : {}) },
  });
  return { value: created.Item.Id };
}

export async function pushInvoice(db, invoice, employer) {
  const customer = await findOrCreateCustomer(db, employer?.name || `Employer ${invoice.employer_id}`, employer?.contact_email);
  const itemRef = await defaultItemRef(db);
  const amount = Number(invoice.amount) || 0;
  const body = {
    CustomerRef: { value: customer.Id },
    ...(invoice.number ? { DocNumber: String(invoice.number) } : {}),
    ...(invoice.issued_at ? { TxnDate: invoice.issued_at } : {}),
    ...(invoice.due_at ? { DueDate: invoice.due_at } : {}),
    Line: [{
      Amount: amount,
      DetailType: 'SalesItemLineDetail',
      Description: `Staffing services${invoice.number ? ` — ${invoice.number}` : ''}`,
      SalesItemLineDetail: { ItemRef: itemRef, Qty: 1, UnitPrice: amount },
    }],
  };
  const created = await api(db, '/invoice', { method: 'POST', body });
  return created.Invoice;
}

export async function companyInfo(db) {
  const qbo = getQbo(db);
  if (!qbo) return null;
  try {
    const data = await api(db, `/companyinfo/${qbo.realm_id}`);
    return data.CompanyInfo?.CompanyName || null;
  } catch {
    return null;
  }
}
