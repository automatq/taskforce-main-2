# Staffing Co. — Staffing Agency Platform

A full staffing-agency SaaS template: a branded public **job board + apply flow**, and a premium dark **admin console** (ATS + CRM) with AI candidate scoring, a candidate pipeline, employer CRM, timesheets + payroll, invoicing, an AI agents dashboard, ATS routing, and Stripe subscription billing.

Stack: Vite + React (frontend) · Express + better-sqlite3 (backend) · any OpenAI-compatible LLM (MiniMax, DeepSeek, Groq, …) for the AI features.

---

## 🚀 One-click deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/automatq/taskforce-main-2)

Render reads `render.yaml`, provisions a persistent disk (so the database + résumés survive restarts), auto-generates `JWT_SECRET`, seeds demo data on first boot, and prompts you for **one thing** — your admin password. That's it. The first time the server boots, that password creates your **Owner** account — from there, invite your team from **Team** in the admin sidebar (see [Team & roles](#-team--roles) below).

**Other hosts** (anything that runs a Docker container with a volume):
- **Railway** — connect the repo; it uses `railway.json`. Add a volume mounted at `/app/persist`, then set the env vars below.
- **Fly.io / any Docker host** — `docker build -t staffing-co . && docker run -p 3001:3001 -v staffing_data:/app/persist -e ADMIN_PASSWORD=... staffing-co`

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `ADMIN_PASSWORD` | **yes** | Password for the first **Owner** account, created automatically the first time the server boots against an empty database. Changing it later does nothing — manage your password from the Team menu instead. |
| `ADMIN_EMAIL` | optional | Email for that first Owner account. Default `owner@staffing.local`. |
| `JWT_SECRET` | recommended | Auto-generated if unset (logins reset on restart unless you set/persist it). |
| `LLM_API_KEY` | optional | Enables live AI résumé scoring + the AI agents. Any **OpenAI-compatible** provider. Without it, those degrade gracefully. |
| `LLM_BASE_URL` | optional | Provider base URL. Default `https://api.minimax.io/v1` (MiniMax). Also works with DeepSeek (`https://api.deepseek.com/v1`), Groq, OpenRouter, Together, OpenAI, local Ollama. |
| `LLM_MODEL` | optional | Model name, default `MiniMax-M2`. Set to your provider's model (e.g. `deepseek-chat`, `llama-3.3-70b-versatile`). |
| `SEED_ON_BOOT` | optional | `true` (default) seeds demo data on an empty DB; set `false` to start empty. |
| `SEED_DEMO_USERS` | optional | Demo `recruiter@demo.local`/`viewer@demo.local` logins (see below) are only seeded when `NODE_ENV` isn't `production` — set this to `true` to include them on a production-mode deploy anyway (e.g. a demo/staging environment). |
| `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` | optional | Enables the real $950/mo Stripe subscription checkout. |
| `STRIPE_WEBHOOK_SECRET` | required with the above | Signing secret for the `/api/stripe/webhook` endpoint — this is what actually confirms a subscription is paid (the checkout redirect alone does not). Get it from the Stripe Dashboard → Webhooks → your endpoint. |
| `QBO_CLIENT_ID` / `QBO_CLIENT_SECRET` | optional | Intuit Developer app credentials — enables live QuickBooks Online invoice sync (OAuth). The QuickBooks **CSV export** works without these. |
| `QBO_ENV` | optional | `sandbox` (default) or `production`. |
| `QBO_REDIRECT_URI` | optional | Must match your Intuit app's redirect URI, e.g. `https://your-app.com/api/quickbooks/callback`. |
| `NODE_ENV` | auto | `production` makes the server serve the built frontend. |
| `PORT` | auto | Provided by the host. |

After deploy, open the URL and sign in at **`/admin`** with `ADMIN_EMAIL` (or the default `owner@staffing.local`) and your `ADMIN_PASSWORD`.

**Wiring up Stripe:** create a webhook endpoint in the Stripe Dashboard pointing at `https://<your-app>/api/stripe/webhook`, subscribed to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.

---

## 🛠 Local development

Requires **Node 22** (the `better-sqlite3` native module doesn't build on Node 26+).

```bash
npm install
npm run seed                                   # populate demo data
PORT=3005 npm run dev:server                   # backend  → :3005
VITE_API_TARGET=http://localhost:3005 npm run dev   # frontend → :5173
```

Create `server/.env` with `ADMIN_PASSWORD=...` (and optionally `ADMIN_EMAIL`, `JWT_SECRET`, plus `LLM_API_KEY`/`LLM_BASE_URL`/`LLM_MODEL` for AI). Open http://localhost:5173, admin at `/admin`. Run `npm run seed` to also get two demo team logins — see below.

---

## 👥 Team & roles

One agency, one login to start — then invite your team from **Team** in the sidebar (Owner only). No shared passwords, no per-seat email/SMTP setup: the Owner sets each person's initial password directly and shares it with them.

| Role | Access |
|---|---|
| **Owner** | Everything — Jobs, Applicants, Employers, Timesheets, Documents, AI Agents, **and** Billing, Settings, QuickBooks, Team management. Exactly what the deploying agency owner needs; the last remaining Owner account can't be demoted, deactivated, or deleted, so you can't lock yourself out. |
| **Recruiter** | Day-to-day ATS work — Jobs, Applicants, Employers, Timesheets, Documents, AI Agents. No Billing, Settings, QuickBooks, or Team. |
| **Viewer** | Read-only across everything a Recruiter can see. |

Every account (including the Owner) can change their own password from the account menu in the top-right corner. In local/dev mode, running `npm run seed` also adds two demo logins so you can try each role — **`recruiter@demo.local`** / **`viewer@demo.local`**, password `demopass123`. **These are never created on a production deploy by default** (that password is public, right here in this README) — they only appear if you explicitly set `SEED_DEMO_USERS=true`. If you do turn them on to demo the product, remove them (or deactivate them from the Team page) before handing the deployment to a real customer.

---

## Features

- **Branded job board** + candidate apply flow (résumé upload)
- **Admin console**: Dashboard KPIs (fill rate, time-to-fill, margin), Jobs, Applicants pipeline, Employers CRM, Timesheets, Billing/invoices, Documents, Settings
- **Positions to fill** — set how many hires a job posting needs; hiring a candidate counts toward it automatically, with a live "2/3 filled" indicator and a "Filled" badge once you hit target (no auto-close — you decide when to close the posting)
- **In-app notifications** — a bell in the topbar tracks new applicants, hires, and fully-staffed jobs, with independent read state per team member
- **Multi-user accounts with roles** — Owner/Recruiter/Viewer, one agency login that scales to a full team (see [Team & roles](#-team--roles))
- **Timesheets & payroll** — hired candidates log hours via a no-login link (`/timesheet/:token`, texted or emailed — no portal account needed); the agency approves in-app, then one click either exports a payroll-ready CSV (ADP/Gusto/Paychex-style) or batch-generates draft client invoices from approved hours using each job's bill rate
- **AI candidate scoring** — résumé vs job, 0–100 + reasons, auto-scored on apply (your LLM provider)
- **Daily AI shortlist** — the top-5 candidates surfaced for you
- **AI Agents** — Reviewer, Follow-up, Receptionist, Voice, Onboarder (Reviewer + Follow-up run on your LLM; voice/telephony are connect-ready)
- **ATS routing** — export/route candidates to Bullhorn, Vincere, etc. (live API connect-ready)
- **Stripe subscription** — $950/mo managed billing (connect Stripe keys to go live)
- **QuickBooks** — one-click invoice CSV export, plus live QuickBooks Online sync (OAuth) when an Intuit app is configured
- **Multi-tenant-ready schema** (`org_id` throughout)
