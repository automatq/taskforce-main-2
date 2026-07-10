import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import {
  GlassCard, StatusBadge, Button, Drawer, Select, Field, Spinner, Icon, ScoreChip,
} from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followup, setFollowup] = useState(false);
  const [pick, setPick] = useState('');
  const [draft, setDraft] = useState('');
  const [drafting, setDrafting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    Promise.all([apiFetch('/admin/agents'), apiFetch('/admin/applicants')])
      .then(([a, ap]) => { setAgents(a); setApplicants(ap); })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const generate = async () => {
    if (!pick) return;
    setDrafting(true); setDraft('');
    try {
      const r = await apiFetch('/admin/agents/followup', { method: 'POST', body: JSON.stringify({ applicant_id: Number(pick) }) });
      setDraft(r.message);
    } catch (err) { toast.error(err.message); }
    setDrafting(false);
  };

  const copy = () => { navigator.clipboard?.writeText(draft); toast.success('Copied to clipboard'); };

  if (loading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;

  return (
    <div className="space-y-6">
      <GlassCard className="flex items-center gap-4 p-5">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 text-zinc-950">
          <Icon name="solar:cpu-bolt-bold" className="text-xl" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Your AI Workforce</h2>
          <p className="text-xs text-zinc-500">Five agents that handle screening, outreach, intake, and onboarding — so your team places more, faster.</p>
        </div>
      </GlassCard>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a) => (
          <GlassCard key={a.key} className="flex flex-col p-5">
            <div className="flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-zinc-950/5 dark:bg-white/5 text-sky-600 dark:text-sky-300 ring-1 ring-zinc-950/10 dark:ring-white/10">
                <Icon name={a.icon} className="text-xl" />
              </span>
              <StatusBadge status={a.status} />
            </div>
            <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">{a.name}</h3>
            <p className="mt-1 flex-1 text-sm text-zinc-500">{a.desc}</p>
            <div className="mt-4 flex items-center justify-between border-t border-zinc-950/[0.06] dark:border-white/[0.06] pt-3">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">{a.metric}</span>
              {a.action === 'draft' && a.status === 'active' && (
                <Button variant="ghost" icon="solar:pen-new-square-linear" className="!px-3 !py-1.5 text-xs" onClick={() => { setFollowup(true); setDraft(''); setPick(''); }}>
                  Draft
                </Button>
              )}
              {a.status === 'connect' && (
                <span className="text-[11px] text-sky-600 dark:text-sky-300">Configure in Settings →</span>
              )}
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Follow-up draft drawer */}
      <Drawer open={followup} onClose={() => setFollowup(false)} title="Draft a Follow-up" width="max-w-lg">
        <div className="space-y-4">
          <Field label="Candidate">
            <Select value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">— Select a candidate —</option>
              {applicants.map((a) => (
                <option key={a.id} value={a.id}>{a.name} · {a.job_title}</option>
              ))}
            </Select>
          </Field>
          <Button icon="solar:magic-stick-3-linear" onClick={generate} disabled={!pick || drafting} className="w-full justify-center">
            {drafting ? 'Drafting…' : 'Generate message'}
          </Button>

          {draft && (
            <div className="rounded-2xl border border-zinc-950/10 dark:border-white/10 bg-zinc-950/[0.03] dark:bg-white/[0.03] p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Drafted message</span>
                <button onClick={copy} className="flex items-center gap-1 text-xs text-sky-600 dark:text-sky-300 hover:text-sky-700 dark:hover:text-sky-200">
                  <Icon name="solar:copy-linear" className="text-xs" /> Copy
                </button>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">{draft}</p>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
}
