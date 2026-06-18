// AI candidate scoring — the product's headline differentiator.
// Extracts résumé text (PDF/DOCX) and asks Claude to score the candidate
// against the job, returning a structured { score 0-100, reasons[] }.
// Degrades gracefully to a no-op when ANTHROPIC_API_KEY is absent so the app
// still runs without AI configured.
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Model is configurable; the approved plan uses Sonnet 4.6 for cost-effective
// high-volume scoring. Override with AI_SCORE_MODEL (e.g. claude-haiku-4-5 to
// go cheaper, or claude-opus-4-8 for maximum quality).
const MODEL = process.env.AI_SCORE_MODEL || 'claude-sonnet-4-6';

const resumeDir = process.env.NODE_ENV === 'production'
  ? '/app/persist/resumes'
  : join(__dirname, '..', '..', 'uploads', 'resumes');

// Structured-output schema: constrains Claude's response to valid JSON.
const SCORE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    score: { type: 'integer', description: 'Match score from 0 (no fit) to 100 (perfect fit)' },
    reasons: {
      type: 'array',
      items: { type: 'string' },
      description: '2-4 concise bullet reasons explaining the score',
    },
  },
  required: ['score', 'reasons'],
};

export function aiScoringEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

async function extractResumeText(filename) {
  if (!filename) return '';
  const filePath = join(resumeDir, filename);
  const ext = extname(filename).toLowerCase();
  try {
    if (ext === '.pdf') {
      // Import the lib file directly to avoid pdf-parse's debug entrypoint.
      const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
      const buf = await readFile(filePath);
      const data = await pdfParse(buf);
      return data.text || '';
    }
    if (ext === '.docx' || ext === '.doc') {
      const { default: mammoth } = await import('mammoth');
      const { value } = await mammoth.extractRawText({ path: filePath });
      return value || '';
    }
  } catch (err) {
    console.error('[aiScore] résumé text extraction failed:', err.message);
  }
  return '';
}

// Core scoring call. Returns { score, reasons } or null on failure / disabled.
export async function scoreApplication({ job, resumeText, applicantName }) {
  if (!aiScoringEnabled()) return null;

  let Anthropic;
  try {
    ({ default: Anthropic } = await import('@anthropic-ai/sdk'));
  } catch (err) {
    console.error('[aiScore] @anthropic-ai/sdk not installed:', err.message);
    return null;
  }

  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

  const prompt = `You are an expert recruiter screening candidates for a staffing agency.
Score how well this candidate's résumé matches the job, from 0 (no fit) to 100 (ideal fit).
Weigh relevant experience, required skills, availability/reliability signals, and overall suitability.
Give 2-4 short, specific reasons. Be discerning — reserve 90+ for genuinely strong matches.

JOB
Title: ${job.title}
Type: ${job.type} · Location: ${job.location}${job.rate ? ` · Pay: $${job.rate}/hr` : ''}
Description: ${job.description || ''}
Requirements: ${job.requirements || 'N/A'}

CANDIDATE: ${applicantName || 'Applicant'}
RÉSUMÉ:
${resumeText ? resumeText.slice(0, 12000) : '(No résumé text could be extracted — score conservatively based on the limited information available.)'}`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      output_config: { format: { type: 'json_schema', schema: SCORE_SCHEMA } },
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock) return null;

    const parsed = JSON.parse(textBlock.text);
    let score = Math.round(Number(parsed.score));
    if (!Number.isFinite(score)) return null;
    score = Math.max(0, Math.min(100, score));
    const reasons = Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 5).map(String) : [];
    return { score, reasons };
  } catch (err) {
    console.error('[aiScore] scoring request failed:', err.message);
    return null;
  }
}

// The Follow-up agent: draft a warm, personalized outreach message to a candidate.
export async function draftFollowUp({ job, applicant }) {
  if (!aiScoringEnabled()) return null;
  let Anthropic;
  try {
    ({ default: Anthropic } = await import('@anthropic-ai/sdk'));
  } catch (err) {
    console.error('[agents] @anthropic-ai/sdk not installed:', err.message);
    return null;
  }
  const client = new Anthropic();
  const prompt = `You are a friendly staffing recruiter. Write a short follow-up message (3-5 sentences) to a candidate who applied, encouraging them and inviting them to a quick screening call. Warm and professional, ready to send as-is — no placeholders, no subject line, just the message body.

Candidate: ${applicant.name}
Applied for: ${job.title}${job.location ? ` (${job.location})` : ''}
Current status: ${applicant.status}${applicant.ai_score != null ? `\nFit score: ${applicant.ai_score}/100` : ''}`;
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });
    const textBlock = response.content.find((b) => b.type === 'text');
    return textBlock ? textBlock.text.trim() : null;
  } catch (err) {
    console.error('[agents] follow-up draft failed:', err.message);
    return null;
  }
}

// Load an application's job + résumé, score it, and persist the result.
export async function scoreApplicationById(db, applicationId) {
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(applicationId);
  if (!app) return null;
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(app.job_id);
  if (!job) return null;

  const resumeText = await extractResumeText(app.resume_path);
  const result = await scoreApplication({ job, resumeText, applicantName: app.name });
  if (!result) return null;

  db.prepare(
    "UPDATE applications SET ai_score = ?, ai_reasons = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(result.score, JSON.stringify(result.reasons), applicationId);
  return result;
}
