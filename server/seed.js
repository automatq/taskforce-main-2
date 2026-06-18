// Seed the database with realistic staffing-agency demo data so the admin
// looks alive on first load. Records mirror the automatq staffing admin demo.
// Run with: npm run seed   (destructive — wipes business tables, keeps the org)
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import db from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// A small, valid placeholder résumé PDF that every seeded applicant points at,
// so the Documents section and résumé downloads work out of the box.
// ---------------------------------------------------------------------------
function buildPdf(text) {
  const objs = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 220]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>',
  ];
  const stream = `BT /F1 16 Tf 40 160 Td (${text}) Tj ET`;
  objs.push(`<</Length ${stream.length}>>\nstream\n${stream}\nendstream`);
  objs.push('<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>');

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => { pdf += String(off).padStart(10, '0') + ' 00000 n \n'; });
  pdf += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;
  return pdf;
}

const resumeDir = process.env.NODE_ENV === 'production'
  ? '/app/persist/resumes'
  : join(__dirname, '..', 'uploads', 'resumes');
mkdirSync(resumeDir, { recursive: true });
const SAMPLE_RESUME = 'seed-sample-resume.pdf';
writeFileSync(join(resumeDir, SAMPLE_RESUME), buildPdf('Staffing Co. - Sample Resume (seed data)'));

// ---------------------------------------------------------------------------
// Wipe business tables (keep organizations) and reseed.
// ---------------------------------------------------------------------------
const wipe = db.transaction(() => {
  db.exec(`
    DELETE FROM applications;
    DELETE FROM invoices;
    DELETE FROM jobs;
    DELETE FROM employers;
    DELETE FROM sqlite_sequence WHERE name IN ('applications','invoices','jobs','employers');
  `);
});
wipe();

// ---------------------------------------------------------------------------
// Employers (client CRM)
// ---------------------------------------------------------------------------
const employers = [
  { name: 'Acme Logistics',   contact: 'Janine Cole',     email: 'janine@acme-logistics.ca', phone: '519-555-0301', plan: 'Pro',   since: 2024 },
  { name: 'BrightLine Telecom', contact: 'Reza Saadat',   email: 'rsaadat@brightline.io',    phone: '519-555-0302', plan: 'Pro',   since: 2025 },
  { name: 'Northland Mill',   contact: 'Patricia Lavoie', email: 'p.lavoie@northlandmill.com', phone: '519-555-0303', plan: 'Basic', since: 2023 },
  { name: 'Hartford Legal',   contact: 'Daniel Wu',       email: 'd.wu@hartford-legal.ca',   phone: '519-555-0304', plan: 'Basic', since: 2025 },
  { name: 'Marigold Bistro',  contact: 'Eve Petrescu',    email: 'eve@marigold.restaurant',  phone: '519-555-0305', plan: 'Basic', since: 2026 },
  { name: 'Maple Outfitters', contact: 'Ben Halverson',   email: 'ben@maple-outfitters.ca',  phone: '519-555-0306', plan: 'Pro',   since: 2022 },
  { name: 'BrightSweep',      contact: 'Aisha Mohammed',  email: 'aisha@brightsweep.ca',     phone: '519-555-0307', plan: 'Trial', since: 2026 },
];

const insertEmployer = db.prepare(
  `INSERT INTO employers (org_id, name, contact_name, contact_email, phone, plan, since)
   VALUES (1, @name, @contact, @email, @phone, @plan, @since)`
);
const employerId = {};
for (const e of employers) {
  const { lastInsertRowid } = insertEmployer.run(e);
  employerId[e.name] = lastInsertRowid;
}

// ---------------------------------------------------------------------------
// Jobs (rate = hourly pay, bill_rate ≈ 1.55× for ~35% gross margin)
// ---------------------------------------------------------------------------
const jobs = [
  { ref: 'j-1041', title: 'Warehouse Associate',          employer: 'Acme Logistics',   location: 'Springfield, ST',   type: 'Full-Time', rate: 22, status: 'active', posted: '2026-05-18' },
  { ref: 'j-1040', title: 'Customer Service Rep',         employer: 'BrightLine Telecom', location: 'Riverton, ST', type: 'Full-Time', rate: 24, status: 'active', posted: '2026-05-17' },
  { ref: 'j-1039', title: 'Forklift Operator (3rd shift)', employer: 'Northland Mill',   location: 'Fairview, ST', type: 'Full-Time', rate: 28, status: 'active', posted: '2026-05-15' },
  { ref: 'j-1038', title: 'Admin Assistant',              employer: 'Hartford Legal',   location: 'Springfield, ST',   type: 'Part-Time', rate: 26, status: 'active', posted: '2026-05-13' },
  { ref: 'j-1037', title: 'Line Cook',                    employer: 'Marigold Bistro',  location: 'Lakeside, ST', type: 'Full-Time', rate: 21, status: 'active', posted: '2026-05-11' },
  { ref: 'j-1036', title: 'Production Lead',              employer: 'Acme Logistics',   location: 'Springfield, ST',   type: 'Full-Time', rate: 32, status: 'closed', posted: '2026-05-08' },
  { ref: 'j-1035', title: 'Retail Associate',             employer: 'Maple Outfitters', location: 'Riverton, ST', type: 'Part-Time', rate: 19, status: 'active', posted: '2026-05-06' },
  { ref: 'j-1034', title: 'Cleaning Crew',                employer: 'BrightSweep',      location: 'Springfield, ST',   type: 'Contract',  rate: 20, status: 'draft',  posted: '2026-05-04' },
];

const insertJob = db.prepare(
  `INSERT INTO jobs (org_id, employer_id, title, location, type, description, requirements, rate, bill_rate, status, is_active, created_at, updated_at)
   VALUES (1, @employer_id, @title, @location, @type, @description, @requirements, @rate, @bill_rate, @status, @is_active, @posted, @posted)`
);
const jobId = {};
for (const j of jobs) {
  const description = `${j.title} role with ${j.employer} in ${j.location}. ${j.type} placement at $${j.rate}/hr. Reliable, punctual, and team-oriented candidates wanted; immediate start available.`;
  const requirements = 'Legally authorized to work in your region. Relevant experience an asset. References required.';
  const { lastInsertRowid } = insertJob.run({
    employer_id: employerId[j.employer],
    title: j.title,
    location: j.location,
    type: j.type,
    description,
    requirements,
    rate: j.rate,
    bill_rate: Math.round(j.rate * 1.55 * 100) / 100,
    status: j.status,
    is_active: j.status === 'active' ? 1 : 0,
    posted: j.posted,
  });
  jobId[j.ref] = lastInsertRowid;
}

// ---------------------------------------------------------------------------
// Applicants (pipeline) — créated_at offset to match the demo's "applied" times
// ---------------------------------------------------------------------------
const reasonsFor = (score) => {
  if (score >= 90) return ['Strong, directly relevant experience', 'Immediate availability', 'Excellent reliability signals on résumé'];
  if (score >= 80) return ['Relevant experience for the role', 'Good availability match', 'Minor gaps in required certifications'];
  if (score >= 70) return ['Some transferable experience', 'Availability partially matches shift', 'Would need onboarding/training'];
  return ['Limited relevant experience', 'Availability mismatch with role', 'Significant skill gaps for this position'];
};

const applicants = [
  { name: 'Maya Tremblay',  email: 'maya.t@gmail.com',      phone: '519-555-0142', score: 92, status: 'new',          job: 'j-1041', ago: '-2 hours'  },
  { name: 'Devon Park',     email: 'devon@outlook.com',     phone: '519-555-0177', score: 88, status: 'new',          job: 'j-1040', ago: '-5 hours'  },
  { name: 'Aisha Khan',     email: 'aisha.k@gmail.com',     phone: '519-555-0119', score: 95, status: 'reviewing',    job: 'j-1038', ago: '-1 day'    },
  { name: 'Marcus Reilly',  email: 'marcus@hey.com',        phone: '519-555-0188', score: 81, status: 'reviewing',    job: 'j-1041', ago: '-1 day'    },
  { name: 'Priya Iyer',     email: 'priya.i@gmail.com',     phone: '519-555-0124', score: 90, status: 'interviewing', job: 'j-1035', ago: '-2 days'   },
  { name: 'Jamal Thompson', email: 'jamal@protonmail.com',  phone: '519-555-0166', score: 85, status: 'new',          job: 'j-1037', ago: '-2 days'   },
  { name: 'Helena Voss',    email: 'helena.v@gmail.com',    phone: '519-555-0133', score: 87, status: 'interviewing', job: 'j-1039', ago: '-3 days'   },
  { name: 'Owen Bailey',    email: 'owen.b@yahoo.com',      phone: '519-555-0155', score: 78, status: 'hired',        job: 'j-1041', ago: '-3 days'   },
  { name: 'Sofia Rinaldi',  email: 'sofia@gmail.com',       phone: '519-555-0102', score: 89, status: 'reviewing',    job: 'j-1038', ago: '-4 days'   },
  { name: 'Tyler Goss',     email: 'tyler.g@gmail.com',     phone: '519-555-0191', score: 64, status: 'rejected',     job: 'j-1040', ago: '-5 days'   },
  { name: 'Naomi Beck',     email: 'naomi.b@gmail.com',     phone: '519-555-0173', score: 91, status: 'hired',        job: 'j-1035', ago: '-6 days'   },
  { name: 'Wes Holloway',   email: 'wes@gmail.com',         phone: '519-555-0148', score: 82, status: 'reviewing',    job: 'j-1037', ago: '-7 days'   },
];

const insertApplicant = db.prepare(
  `INSERT INTO applications (org_id, job_id, name, email, phone, resume_path, status, ai_score, ai_reasons, created_at, updated_at)
   VALUES (1, @job_id, @name, @email, @phone, @resume, @status, @score, @reasons, datetime('now', @ago), datetime('now', @ago))`
);
for (const a of applicants) {
  insertApplicant.run({
    job_id: jobId[a.job],
    name: a.name,
    email: a.email,
    phone: a.phone,
    resume: SAMPLE_RESUME,
    status: a.status,
    score: a.score,
    reasons: JSON.stringify(reasonsFor(a.score)),
    ago: a.ago,
  });
}

// ---------------------------------------------------------------------------
// Invoices (employer billing)
// ---------------------------------------------------------------------------
const invoices = [
  { employer: 'Acme Logistics',   number: 'INV-1001', amount: 4280, status: 'paid',    issued: '2026-05-20', due: '2026-06-03' },
  { employer: 'BrightLine Telecom', number: 'INV-1002', amount: 2880, status: 'sent',    issued: '2026-05-22', due: '2026-06-05' },
  { employer: 'Northland Mill',   number: 'INV-1003', amount: 3360, status: 'overdue', issued: '2026-05-10', due: '2026-05-24' },
  { employer: 'Hartford Legal',   number: 'INV-1004', amount: 1560, status: 'paid',    issued: '2026-05-18', due: '2026-06-01' },
  { employer: 'Maple Outfitters', number: 'INV-1005', amount: 2090, status: 'sent',    issued: '2026-05-25', due: '2026-06-08' },
  { employer: 'Marigold Bistro',  number: 'INV-1006', amount: 1240, status: 'draft',   issued: null,         due: null },
];
const insertInvoice = db.prepare(
  `INSERT INTO invoices (org_id, employer_id, number, amount, status, issued_at, due_at)
   VALUES (1, @employer_id, @number, @amount, @status, @issued, @due)`
);
for (const v of invoices) {
  insertInvoice.run({ employer_id: employerId[v.employer], number: v.number, amount: v.amount, status: v.status, issued: v.issued, due: v.due });
}

const counts = {
  employers: db.prepare('SELECT COUNT(*) n FROM employers').get().n,
  jobs: db.prepare('SELECT COUNT(*) n FROM jobs').get().n,
  applicants: db.prepare('SELECT COUNT(*) n FROM applications').get().n,
  invoices: db.prepare('SELECT COUNT(*) n FROM invoices').get().n,
};
console.log('Seeded:', counts);
