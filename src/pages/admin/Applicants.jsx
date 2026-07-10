import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import {
  GlassCard, Table, StatusBadge, ScoreChip, Button, IconButton, Drawer, Select,
  Spinner, EmptyState, Icon, SearchInput, relativeDate,
} from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';
import { useConfirm } from '../../components/admin/Confirm';

const STATUSES = ['new', 'reviewing', 'interviewing', 'hired', 'rejected'];

export default function Applicants() {
  const [applicants, setApplicants] = useState([]);
  const [aiScoring, setAiScoring] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get('status') || 'all');
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [sortByScore, setSortByScore] = useState(false);
  const [active, setActive] = useState(null);
  const [scoring, setScoring] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      // /admin/stats (not /admin/settings, which is owner-only) is where
      // aiScoring is read from — it's open to every role, same as this page.
      const [a, s] = await Promise.all([apiFetch('/admin/applicants'), apiFetch('/admin/stats')]);
      setApplicants(a); setAiScoring(s.aiScoring);
    } catch (err) {
      toast.error(err.message);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    setFilter(searchParams.get('status') || 'all');
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  const changeStatus = async (id, status) => {
    setApplicants((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    if (active?.id === id) setActive({ ...active, status });
    try {
      await apiFetch(`/admin/applicants/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      toast.success(`Moved to ${status}`);
    } catch (err) { toast.error(err.message); load(); }
  };

  const rescore = async (id) => {
    setScoring(true);
    try {
      const result = await apiFetch(`/admin/applicants/${id}/score`, { method: 'POST' });
      setApplicants((prev) => prev.map((a) => (a.id === id ? { ...a, ai_score: result.score, ai_reasons: result.reasons, ai_score_error: null } : a)));
      if (active?.id === id) setActive({ ...active, ai_score: result.score, ai_reasons: result.reasons, ai_score_error: null });
      toast.success(`Scored ${result.score}/100`);
    } catch (err) {
      setApplicants((prev) => prev.map((a) => (a.id === id ? { ...a, ai_score_error: err.message } : a)));
      if (active?.id === id) setActive({ ...active, ai_score_error: err.message });
      toast.error(err.message);
    }
    setScoring(false);
  };

  const copyTimesheetLink = async (id) => {
    try {
      const r = await apiFetch(`/admin/applicants/${id}/timesheet-link`);
      await navigator.clipboard?.writeText(r.url);
      toast.success('Timesheet link copied — send it to the candidate');
    } catch (err) { toast.error(err.message); }
  };

  const routeToAts = async (id) => {
    try {
      const r = await apiFetch(`/admin/applicants/${id}/route`, { method: 'POST' });
      if (r.routed) toast.success(`Routed to ${r.provider} (HTTP ${r.httpStatus})`);
      else toast.info(`No ATS webhook set — payload ready for ${r.provider}. Configure it in Settings → Integrations.`);
    } catch (err) { toast.error(err.message); }
  };

  const remove = async (a) => {
    const ok = await confirm({ title: 'Delete candidate?', message: `“${a.name}” and their résumé will be permanently removed. Candidates with an invoiced timesheet can't be deleted.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await apiFetch(`/admin/applicants/${a.id}`, { method: 'DELETE' });
      toast.success('Candidate deleted');
      setActive(null); await load();
    } catch (err) { toast.error(err.message); }
  };

  const downloadResume = async (id, name) => {
    const token = localStorage.getItem('tf_admin_token');
    const res = await fetch(`/api/admin/applicants/${id}/resume`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return toast.error('Résumé not available');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${name.replace(/\s+/g, '_')}_resume.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  const q = query.trim().toLowerCase();
  const shown = useMemo(() => {
    let list = applicants
      .filter((a) => filter === 'all' || a.status === filter)
      .filter((a) => !q || `${a.name} ${a.email || ''} ${a.job_title} ${a.company || ''}`.toLowerCase().includes(q));
    if (sortByScore) list = [...list].sort((a, b) => (b.ai_score ?? -1) - (a.ai_score ?? -1));
    return list;
  }, [applicants, filter, q, sortByScore]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-xl bg-zinc-950/[0.04] dark:bg-white/[0.04] p-1 ring-1 ring-zinc-950/10 dark:ring-white/10">
          {['all', ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium capitalize transition ${filter === s ? 'bg-zinc-950/10 dark:bg-white/10 text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
            >
              {s} {s !== 'all' && <span className="text-zinc-400 dark:text-zinc-600">({applicants.filter((a) => a.status === s).length})</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSortByScore((v) => !v)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition ${sortByScore ? 'border-sky-400/30 bg-sky-500/10 text-sky-600 dark:text-sky-300' : 'border-zinc-950/10 dark:border-white/10 bg-zinc-950/[0.04] dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
            title="Sort by AI score"
          >
            <Icon name="solar:sort-vertical-linear" className="text-sm" /> Top score
          </button>
          <SearchInput value={query} onChange={setQuery} placeholder="Search candidates…" />
        </div>
      </div>

      <GlassCard>
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : shown.length === 0 ? (
          <EmptyState icon="solar:users-group-rounded-linear" title={q || filter !== 'all' ? 'No matching applicants' : 'No applicants'} hint="Applications submitted on the job board appear here, auto-scored." />
        ) : (
          <Table columns={[
            { label: 'Candidate' }, { label: 'Role' }, { label: 'AI Score' }, { label: 'Applied' }, { label: 'Status' }, { label: '', align: 'right' },
          ]}>
            {shown.map((a) => (
              <tr key={a.id} className="group cursor-pointer transition hover:bg-zinc-950/[0.03] dark:hover:bg-white/[0.03]" onClick={() => setActive(a)}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-zinc-950/5 dark:bg-white/5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 ring-1 ring-zinc-950/10 dark:ring-white/10">
                      {a.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </span>
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-white">{a.name}</div>
                      <div className="text-xs text-zinc-500">{a.email || a.phone}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="text-zinc-700 dark:text-zinc-300">{a.job_title}</div>
                  <div className="text-xs text-zinc-500">{a.company || '—'}</div>
                </td>
                <td className="px-5 py-3.5"><ScoreChip score={a.ai_score} error={a.ai_score_error} /></td>
                <td className="px-5 py-3.5 text-zinc-500">{relativeDate(a.created_at)}</td>
                <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={a.status}
                    onChange={(e) => changeStatus(a.id, e.target.value)}
                    className="cursor-pointer rounded-lg border border-zinc-950/10 dark:border-white/10 bg-zinc-950/[0.04] dark:bg-white/[0.04] px-2 py-1 text-xs capitalize text-zinc-800 dark:text-zinc-200 outline-none focus:border-sky-400/50"
                  >
                    {STATUSES.map((s) => <option key={s} value={s} className="bg-white dark:bg-zinc-900 capitalize">{s}</option>)}
                  </select>
                </td>
                <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                    <IconButton icon="solar:eye-linear" title="View profile" onClick={() => setActive(a)} />
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </GlassCard>

      <Drawer open={!!active} onClose={() => setActive(null)} title="Candidate Profile" width="max-w-lg">
        {active && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-zinc-950/5 dark:bg-white/5 text-lg font-semibold text-zinc-900 dark:text-white ring-1 ring-zinc-950/10 dark:ring-white/10">
                {active.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{active.name}</h3>
                <div className="text-sm text-zinc-500">{active.job_title} · {active.company || '—'}</div>
              </div>
              <ScoreChip score={active.ai_score} error={active.ai_score_error} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow icon="solar:letter-linear" label="Email" value={active.email ? <a href={`mailto:${active.email}`} className="text-sky-600 dark:text-sky-300 hover:underline">{active.email}</a> : '—'} />
              <InfoRow icon="solar:phone-linear" label="Phone" value={<a href={`tel:${active.phone}`} className="text-zinc-800 dark:text-zinc-200 hover:text-sky-600 dark:hover:text-sky-300">{active.phone}</a>} />
              <InfoRow icon="solar:calendar-linear" label="Applied" value={relativeDate(active.created_at)} />
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">Status</div>
                <Select value={active.status} onChange={(e) => changeStatus(active.id, e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                </Select>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-950/10 dark:border-white/10 bg-zinc-950/[0.03] dark:bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="solar:magic-stick-3-bold" className="text-base text-sky-600 dark:text-sky-300" />
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white">AI Assessment</span>
                </div>
                <Button variant="ghost" icon="solar:refresh-linear" onClick={() => rescore(active.id)} disabled={scoring || !aiScoring} className="!px-3 !py-1.5 text-xs">
                  {scoring ? 'Scoring…' : 'Re-score'}
                </Button>
              </div>
              {active.ai_score != null ? (
                <>
                  <div className="mt-3 text-3xl font-semibold text-zinc-900 dark:text-white">{active.ai_score}<span className="text-base text-zinc-500">/100</span></div>
                  <ul className="mt-3 space-y-1.5">
                    {(active.ai_reasons || []).map((r, i) => (
                      <li key={i} className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <Icon name="solar:check-circle-bold" className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400" />
                        {r}
                      </li>
                    ))}
                  </ul>
                  {active.ai_score_error && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-500/10 p-3 ring-1 ring-rose-400/20">
                      <Icon name="solar:danger-triangle-bold" className="mt-0.5 text-sm text-rose-600 dark:text-rose-300" />
                      <p className="min-w-0 text-sm text-rose-700 dark:text-rose-200 break-words">Showing the last successful score — a more recent re-score attempt failed: {active.ai_score_error}</p>
                    </div>
                  )}
                </>
              ) : active.ai_score_error ? (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-500/10 p-3 ring-1 ring-rose-400/20">
                  <Icon name="solar:danger-triangle-bold" className="mt-0.5 text-sm text-rose-600 dark:text-rose-300" />
                  <p className="min-w-0 text-sm text-rose-700 dark:text-rose-200 break-words">Scoring failed: {active.ai_score_error}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-zinc-500">
                  {aiScoring ? 'Not yet scored. Click Re-score to evaluate this résumé against the job.' : 'AI scoring is inactive — set LLM_API_KEY to enable.'}
                </p>
              )}
            </div>

            {active.status === 'hired' && (
              <Button variant="ghost" icon="solar:clock-square-linear" onClick={() => copyTimesheetLink(active.id)} className="w-full justify-center">Copy Timesheet Link</Button>
            )}
            <div className="flex gap-2">
              <Button variant="ghost" icon="solar:download-linear" onClick={() => downloadResume(active.id, active.name)} className="flex-1 justify-center">Résumé</Button>
              <Button variant="ghost" icon="solar:upload-square-linear" onClick={() => routeToAts(active.id)} className="flex-1 justify-center">Route to ATS</Button>
            </div>
            <Button variant="danger" icon="solar:trash-bin-trash-linear" onClick={() => remove(active)} className="w-full justify-center">Delete Candidate</Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-zinc-500">
        <Icon name={icon} className="text-xs" /> {label}
      </div>
      <div className="truncate text-zinc-800 dark:text-zinc-200">{value}</div>
    </div>
  );
}
