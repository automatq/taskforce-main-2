import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const persistDir = process.env.NODE_ENV === 'production' ? '/app/persist' : join(__dirname, '..', 'data');
mkdirSync(persistDir, { recursive: true });

const dbPath = join(persistDir, 'staffing.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------------
// Base tables. Tenant-ready: every business table carries an org_id so the
// later jump to multi-tenant SaaS is a scoping change, not a rewrite. For now
// a single organization (id = 1) represents the agency.
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT 'Staffing Co.',
    settings TEXT NOT NULL DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS employers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_name TEXT,
    contact_email TEXT,
    phone TEXT,
    plan TEXT NOT NULL DEFAULT 'Trial',
    since INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT 'Your City, ST',
    type TEXT NOT NULL DEFAULT 'Full-Time',
    description TEXT NOT NULL,
    requirements TEXT,
    pay_range TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    resume_path TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id) ON DELETE CASCADE,
    employer_id INTEGER REFERENCES employers(id) ON DELETE CASCADE,
    number TEXT,
    amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    issued_at TEXT,
    due_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// ---------------------------------------------------------------------------
// Idempotent additive migrations for columns introduced after the original
// jobs/applications tables shipped. SQLite can't ADD COLUMN with a
// non-constant default, so new timestamp columns are nullable + backfilled.
// ---------------------------------------------------------------------------
function columnNames(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
}
function addColumn(table, name, definition) {
  if (!columnNames(table).includes(name)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

addColumn('jobs', 'org_id', 'org_id INTEGER NOT NULL DEFAULT 1');
addColumn('jobs', 'employer_id', 'employer_id INTEGER REFERENCES employers(id) ON DELETE SET NULL');
addColumn('jobs', 'rate', 'rate REAL');         // hourly pay rate ($/hr)
addColumn('jobs', 'bill_rate', 'bill_rate REAL'); // hourly bill rate charged to the employer
addColumn('jobs', 'status', "status TEXT NOT NULL DEFAULT 'active'"); // active | closed | draft

addColumn('applications', 'org_id', 'org_id INTEGER NOT NULL DEFAULT 1');
addColumn('applications', 'email', 'email TEXT');
addColumn('applications', 'status', "status TEXT NOT NULL DEFAULT 'new'"); // new | reviewing | interviewing | hired | rejected
addColumn('applications', 'ai_score', 'ai_score INTEGER');
addColumn('applications', 'ai_reasons', 'ai_reasons TEXT'); // JSON array of strings
addColumn('applications', 'updated_at', 'updated_at TEXT');

// System-managed integration tokens (QuickBooks, etc.) — kept separate from the
// user-editable `settings` JSON so saving the profile form can't clobber them.
addColumn('organizations', 'integrations', "integrations TEXT NOT NULL DEFAULT '{}'");

// Backfill derived/timestamp columns once.
db.exec(`
  UPDATE jobs SET status = CASE WHEN is_active = 1 THEN 'active' ELSE 'draft' END
    WHERE status IS NULL OR status = '';
  UPDATE applications SET updated_at = created_at WHERE updated_at IS NULL;
`);

// Indexes on hot foreign keys.
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
  CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
  CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer_id);
  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_invoices_employer ON invoices(employer_id);
`);

// Ensure the default organization exists.
const orgCount = db.prepare('SELECT COUNT(*) AS n FROM organizations').get().n;
if (orgCount === 0) {
  db.prepare("INSERT INTO organizations (id, name) VALUES (1, 'Staffing Co.')").run();
}

export default db;
