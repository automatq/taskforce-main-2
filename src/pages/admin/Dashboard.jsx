import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import {
  GlassCard, StatCard, ScoreChip, StatusBadge, Spinner, Icon, Button, money, relativeDate,
} from '../../components/admin/ui';

const PIPELINE = [
  { key: 'new', label: 'New', color: 'bg-sky-400', statKey: 'newApplicants' },
  { key: 'reviewing', label: 'Reviewing', color: 'bg-amber-400', statKey: 'reviewing' },
  { key: 'interviewing', label: 'Interviewing', color: 'bg-violet-400', statKey: 'interviewing' },
  { key: 'hired', label: 'Hired', color: 'bg-emerald-400', statKey: 'hired' },
  { key: 'rejected', label: 'Rejected', color: 'bg-rose-400', statKey: 'rejected' },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [shortlist, setShortlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      apiFetch('/admin/stats'),
      apiFetch('/admin/applicants'),
      apiFetch('/admin/jobs'),
      apiFetch('/admin/invoices'),
      apiFetch('/admin/shortlist'),
    ])
      .then(([s, a, j, v, sl]) => { setStats(s); setApplicants(a); setJobs(j); setInvoices(v); setShortlist(sl); })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  if (!stats) return null;

  const pipelineTotal = PIPELINE.reduce((t, p) => t + (stats[p.statKey] || 0), 0) || 1;

  return (
    <div className="space-y-8">
      {/* Primary KPIs */}
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatCard label="Active Jobs" value={stats.activeJobs} icon="solar:case-minimalistic-bold" accent="sky" sub={`${stats.totalJobs} total postings`} />
        <StatCard label="New Applicants" value={stats.newApplicants} icon="solar:user-plus-bold" accent="emerald" sub="awaiting review" />
        <StatCard label="Interviewing" value={stats.interviewing} icon="solar:users-group-rounded-bold" accent="violet" sub="in active interviews" />
        <StatCard label="Hired" value={stats.hired} icon="solar:check-circle-bold" accent="emerald" sub="placements made" />
      </div>

      {/* Owner KPIs */}
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-5">
        <StatCard label="Fill Rate" value={`${stats.fillRate}%`} icon="solar:chart-2-bold" accent="sky" />
        <StatCard label="Time to Fill" value={stats.timeToFill != null ? `${stats.timeToFill}d` : '—'} icon="solar:clock-circle-bold" accent="amber" />
        <StatCard label="Pipeline (7d)" value={stats.pipelineVelocity} icon="solar:graph-up-bold" accent="violet" />
        <StatCard label="Gross Margin" value={stats.grossMargin != null ? `${stats.grossMargin}%` : '—'} icon="solar:money-bag-bold" accent="emerald" />
        <StatCard label="Outstanding" value={money(stats.outstanding)} icon="solar:bill-list-bold" accent="rose" />
      </div>

      {/* Pipeline funnel */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Candidate Pipeline</h2>
          <Link to="/admin/applicants" className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200">Open pipeline →</Link>
        </div>
        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-zinc-950/5 dark:bg-white/5">
          {PIPELINE.map((p) => {
            const v = stats[p.statKey] || 0;
            return v > 0 ? <div key={p.key} className={p.color} style={{ width: `${(v / pipelineTotal) * 100}%` }} title={`${p.label}: ${v}`} /> : null;
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {PIPELINE.map((p) => (
            <button
              key={p.key}
              onClick={() => navigate(`/admin/applicants?status=${p.key}`)}
              className="group flex items-center gap-2 text-sm transition hover:opacity-80"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${p.color}`} />
              <span className="text-zinc-600 group-hover:text-zinc-800 dark:text-zinc-400 dark:group-hover:text-zinc-200">{p.label}</span>
              <span className="font-semibold text-zinc-900 dark:text-white">{stats[p.statKey] || 0}</span>
            </button>
          ))}
        </div>
      </GlassCard>

      {/* AI daily shortlist — the Reviewer agent's top picks */}
      <GlassCard className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-950/10 px-5 py-4 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Icon name="solar:magic-stick-3-bold" className="text-lg text-emerald-600 dark:text-emerald-300" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Today's AI Shortlist</h2>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-600 ring-1 ring-emerald-400/20 dark:text-emerald-300">Top 5</span>
          </div>
          <span className="hidden text-xs text-zinc-500 sm:block">Auto-emailed daily when connected</span>
        </div>
        {shortlist.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-400 dark:text-zinc-600">No scored candidates yet — the Reviewer agent surfaces your top 5 here as applications come in.</p>
        ) : (
          <div className="grid gap-px bg-zinc-950/[0.06] sm:grid-cols-5 dark:bg-white/[0.06]">
            {shortlist.map((a, i) => (
              <button
                key={a.id}
                onClick={() => navigate(`/admin/applicants?q=${encodeURIComponent(a.name)}`)}
                className="flex flex-col bg-white p-4 text-left transition hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-600">#{i + 1}</span>
                  <ScoreChip score={a.ai_score} />
                </div>
                <div className="mt-2 truncate text-sm font-medium text-zinc-900 dark:text-white">{a.name}</div>
                <div className="truncate text-xs text-zinc-500">{a.job_title}</div>
                <div className="mt-1 truncate text-[11px] text-zinc-400 dark:text-zinc-600">{a.company || '—'}</div>
              </button>
            ))}
          </div>
        )}
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent applicants */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-zinc-950/10 px-5 py-4 dark:border-white/10">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Recent Applicants</h2>
            <Link to="/admin/applicants" className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200">View all →</Link>
          </div>
          <div className="divide-y divide-zinc-950/[0.06] dark:divide-white/[0.06]">
            {applicants.slice(0, 6).map((a) => (
              <button
                key={a.id}
                onClick={() => navigate(`/admin/applicants?q=${encodeURIComponent(a.name)}`)}
                className="flex w-full items-center gap-4 px-5 py-3 text-left transition hover:bg-zinc-950/[0.03] dark:hover:bg-white/[0.03]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-950/5 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-950/10 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10">
                  {a.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-zinc-900 dark:text-white">{a.name}</div>
                  <div className="truncate text-xs text-zinc-500">{a.job_title} · {a.company || '—'}</div>
                </div>
                <ScoreChip score={a.ai_score} />
                <StatusBadge status={a.status} />
                <span className="hidden w-20 text-right text-xs text-zinc-400 dark:text-zinc-600 md:block">{relativeDate(a.created_at)}</span>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Quick actions + AI status */}
        <div className="space-y-6">
          <GlassCard className="p-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Quick Actions</h2>
            <div className="mt-4 space-y-2">
              <Link to="/admin/jobs"><Button icon="solar:add-circle-linear" className="w-full justify-start">Post a new job</Button></Link>
              <Link to="/admin/applicants"><Button variant="ghost" icon="solar:users-group-rounded-linear" className="mt-2 w-full justify-start">Review pipeline</Button></Link>
              <Link to="/admin/billing"><Button variant="ghost" icon="solar:card-linear" className="mt-2 w-full justify-start">Create invoice</Button></Link>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center gap-2">
              <Icon name="solar:magic-stick-3-bold" className={`text-lg ${stats.aiScoring ? 'text-emerald-600 dark:text-emerald-300' : 'text-zinc-500'}`} />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">AI Candidate Scoring</h2>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              {stats.aiScoring
                ? 'Active — new applications are auto-scored by Claude against the job.'
                : 'Inactive — set LLM_API_KEY to auto-score new applicants 0–100.'}
            </p>
            <div className="mt-3"><StatusBadge status={stats.aiScoring ? 'active' : 'draft'} /></div>
          </GlassCard>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Open roles snapshot */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-zinc-950/10 px-5 py-4 dark:border-white/10">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Open Roles</h2>
            <Link to="/admin/jobs" className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200">Manage →</Link>
          </div>
          <div className="grid gap-px bg-zinc-950/[0.06] sm:grid-cols-2 dark:bg-white/[0.06]">
            {jobs.filter((j) => j.status === 'active').slice(0, 6).map((j) => (
              <button
                key={j.id}
                onClick={() => navigate(`/admin/applicants?q=${encodeURIComponent(j.title)}`)}
                className="bg-white p-4 text-left transition hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">{j.title}</span>
                  <span className="text-xs text-zinc-500">{j.applicant_count} appl.</span>
                </div>
                <div className="mt-1 text-xs text-zinc-500">{j.company || '—'} · {j.location}</div>
                <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-300">${j.rate}/hr</div>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Recent invoices */}
        <GlassCard>
          <div className="flex items-center justify-between border-b border-zinc-950/10 px-5 py-4 dark:border-white/10">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Recent Invoices</h2>
            <Link to="/admin/billing" className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200">Billing →</Link>
          </div>
          <div className="divide-y divide-zinc-950/[0.06] dark:divide-white/[0.06]">
            {invoices.slice(0, 5).map((v) => (
              <div key={v.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-900 dark:text-white">{v.company || '—'}</div>
                  <div className="text-xs text-zinc-500">{v.number}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm tabular-nums text-zinc-800 dark:text-zinc-200">{money(v.amount)}</span>
                  <StatusBadge status={v.status} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
