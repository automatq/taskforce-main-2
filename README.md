# Staffing Co. — Staffing Agency Platform

A full staffing-agency SaaS template: a branded public **job board + apply flow**, and a premium dark **admin console** (ATS + CRM) with AI candidate scoring, a candidate pipeline, employer CRM, invoicing, an AI agents dashboard, ATS routing, and Stripe subscription billing.

Stack: Vite + React (frontend) · Express + better-sqlite3 (backend) · any OpenAI-compatible LLM (MiniMax, DeepSeek, Groq, …) for the AI features.

---

## 🚀 One-click deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/automatq/taskforce-main-2)

Render reads `render.yaml`, provisions a persistent disk (so the database + résumés survive restarts), auto-generates `JWT_SECRET`, seeds demo data on first boot, and prompts you for **one thing** — your admin password. That's it.

**Other hosts** (anything that runs a Docker container with a volume):
- **Railway** — connect the repo; it uses `railway.json`. Add a volume mounted at `/app/persist`, then set the env vars below.
- **Fly.io / any Docker host** — `docker build -t staffing-co . && docker run -p 3001:3001 -v staffing_data:/app/persist -e ADMIN_PASSWORD=... staffing-co`

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `ADMIN_PASSWORD` | **yes** | Your admin login password. Hashed automatically at boot. |
| `JWT_SECRET` | recommended | Auto-generated if unset (logins reset on restart unless you set/persist it). |
| `LLM_API_KEY` | optional | Enables live AI résumé scoring + the AI agents. Any **OpenAI-compatible** provider. Without it, those degrade gracefully. |
| `LLM_BASE_URL` | optional | Provider base URL. Default `https://api.minimax.io/v1` (MiniMax). Also works with DeepSeek (`https://api.deepseek.com/v1`), Groq, OpenRouter, Together, OpenAI, local Ollama. |
| `LLM_MODEL` | optional | Model name, default `MiniMax-M2`. Set to your provider's model (e.g. `deepseek-chat`, `llama-3.3-70b-versatile`). |
| `SEED_ON_BOOT` | optional | `true` (default) seeds demo data on an empty DB; set `false` to start empty. |
| `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` | optional | Enables the real $950/mo Stripe subscription checkout. |
| `QBO_CLIENT_ID` / `QBO_CLIENT_SECRET` | optional | Intuit Developer app credentials — enables live QuickBooks Online invoice sync (OAuth). The QuickBooks **CSV export** works without these. |
| `QBO_ENV` | optional | `sandbox` (default) or `production`. |
| `QBO_REDIRECT_URI` | optional | Must match your Intuit app's redirect URI, e.g. `https://your-app.com/api/quickbooks/callback`. |
| `NODE_ENV` | auto | `production` makes the server serve the built frontend. |
| `PORT` | auto | Provided by the host. |

After deploy, open the URL and sign in at **`/admin`** with your `ADMIN_PASSWORD`.

---

## 🛠 Local development

Requires **Node 22** (the `better-sqlite3` native module doesn't build on Node 26+).

```bash
npm install
npm run seed                                   # populate demo data
PORT=3005 npm run dev:server                   # backend  → :3005
VITE_API_TARGET=http://localhost:3005 npm run dev   # frontend → :5173
```

Create `server/.env` with `ADMIN_PASSWORD=...` (and optionally `JWT_SECRET`, plus `LLM_API_KEY`/`LLM_BASE_URL`/`LLM_MODEL` for AI). Open http://localhost:5173, admin at `/admin`.

---

## Features

- **Branded job board** + candidate apply flow (résumé upload)
- **Admin console**: Dashboard KPIs (fill rate, time-to-fill, margin), Jobs, Applicants pipeline, Employers CRM, Billing/invoices, Documents, Settings
- **AI candidate scoring** — résumé vs job, 0–100 + reasons, auto-scored on apply (your LLM provider)
- **Daily AI shortlist** — the top-5 candidates surfaced for you
- **AI Agents** — Reviewer, Follow-up, Receptionist, Voice, Onboarder (Reviewer + Follow-up run on your LLM; voice/telephony are connect-ready)
- **ATS routing** — export/route candidates to Bullhorn, Vincere, etc. (live API connect-ready)
- **Stripe subscription** — $950/mo managed billing (connect Stripe keys to go live)
- **QuickBooks** — one-click invoice CSV export, plus live QuickBooks Online sync (OAuth) when an Intuit app is configured
- **Multi-tenant-ready schema** (`org_id` throughout)
