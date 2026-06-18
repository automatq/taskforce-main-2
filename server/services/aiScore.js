// AI candidate scoring + follow-up drafting — the product's headline features.
// Provider-agnostic: calls any OpenAI-compatible chat/completions endpoint
// (MiniMax, DeepSeek, Groq, OpenRouter, Together, OpenAI, local Ollama, …).
// Configure with env vars:
//   LLM_API_KEY   – provider API key (required to enable AI features)
//   LLM_BASE_URL  – default https://api.minimax.io/v1  (MiniMax)
//   LLM_MODEL     – default MiniMax-M2
// Degrades gracefully to a no-op when LLM_API_KEY is absent.
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL = (process.env.LLM_BASE_URL || 'https://api.minimax.io/v1').replace(/\/+$/, '');
const MODEL = process.env.LLM_MODEL || 'MiniMax-M2';

const resumeDir = process.env.NODE_ENV === 'production'
  ? '/app/persist/resumes'
  : join(__dirname, '..', '..', 'uploads', 'resumes');

export function aiScoringEnabled() {
  return Boolean(process.env.LLM_API_KEY);
}

// Minimal OpenAI-compatible chat call.
async function chat(messages, { maxTokens = 1024, json = false } = {}) {
  const body = { model: MODEL, messages, max_tokens: maxTokens, temperature: 0.4 };
  if (json) body.response_format = { type: 'json_object' };

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`LLM ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// Tolerant JSON extraction — providers vary in how strictly they honor json mode.
function extractJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { /* fall through */ }
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* ignore */ } }
  return null;
}

async function extractResumeText(filename) {
  if (!filename) return '';
  const filePath = join(resumeDir, filename);
  const ext = extname(filename).toLowerCase();
  try {
    if (ext === '.pdf') {
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

// Score a résumé against a job → { score 0-100, reasons[] } or null.
export async function scoreApplication({ job, resumeText, applicantName }) {
  if (!aiScoringEnabled()) return null;
  const system =
    'You are an expert recruiter screening candidates for a staffing agency. ' +
    'Respond with ONLY a JSON object of the form {"score": <integer 0-100>, "reasons": [<2-4 short strings>]}. No prose, no markdown.';
  const user = `Score how well this candidate's résumé matches the job, from 0 (no fit) to 100 (ideal fit). Weigh relevant experience, required skills, availability/reliability signals, and overall suitability. Reserve 90+ for genuinely strong matches.

JOB
Title: ${job.title}
Type: ${job.type} · Location: ${job.location}${job.rate ? ` · Pay: $${job.rate}/hr` : ''}
Description: ${job.description || ''}
Requirements: ${job.requirements || 'N/A'}

CANDIDATE: ${applicantName || 'Applicant'}
RÉSUMÉ:
${resumeText ? resumeText.slice(0, 12000) : '(No résumé text could be extracted — score conservatively.)'}`;

  try {
    const content = await chat(
      [{ role: 'system', content: system }, { role: 'user', content: user }],
      { maxTokens: 600, json: true }
    );
    const parsed = extractJson(content);
    if (!parsed) return null;
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
  const user = `You are a friendly staffing recruiter. Write a short follow-up message (3-5 sentences) to a candidate who applied, encouraging them and inviting them to a quick screening call. Warm and professional, ready to send as-is — no placeholders, no subject line, just the message body.

Candidate: ${applicant.name}
Applied for: ${job.title}${job.location ? ` (${job.location})` : ''}
Current status: ${applicant.status}${applicant.ai_score != null ? `\nFit score: ${applicant.ai_score}/100` : ''}`;
  try {
    const content = await chat([{ role: 'user', content: user }], { maxTokens: 400 });
    return content.trim() || null;
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
