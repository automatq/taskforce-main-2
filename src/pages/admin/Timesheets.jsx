import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api';
import {
  GlassCard, StatCard, Table, StatusBadge, Button, IconButton, Drawer, Field, Input, Select,
  Textarea, Spinner, EmptyState, Icon, SearchInput, money,
} from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';
import { useConfirm } from '../../components/admin/Confirm';

const STATUSES = ['submitted', 'approved', 'rejected', 'invoiced'];
const DAYS = [
  { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' }, { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' }, { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' }, { key: 'sun', label: 'Sun' },
];
const blankHours = { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' };

function mostRecentMonday() {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

export default function Timesheets() {
  const [timesheets, setTimesheets] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new'
  const [form, setForm] = useState({ application_id: '', week_start: mostRecentMonday(), hours: { ...blankHours }, notes: '' });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    const [t, a] = await Promise.all([apiFetch('/admin/timesheets'), apiFetch('/admin/applicants')]);
    setTimesheets(t); setApplicants(a);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const hiredApplicants = applicants.filter((a) => a.status === 'hired');

  const openNew = () => { setForm({ application_id: '', week_start: mostRecentMonday(), hours: { ...blankHours }, notes: '' }); setEditing('new'); };

  const save = async (e) => {
    e.preventDefault();
    if (!form.application_id) return toast.error('Select a candidate');
    setSaving(true);
    try {
      await apiFetch('/admin/timesheets', {
        method: 'POST',
        body: JSON.stringify({ application_id: Number(form.application_id), week_start: form.week_start, daily_hours: form.hours, notes: form.notes }),
      });
      toast.success('Timesheet recorded');
      setEditing(null); await load();
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  };

  const review = async (id, status) => {
    try {
      const updated = await apiFetch(`/admin/timesheets/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setTimesheets((prev) => prev.map((t) => (t.id === id ? updated : t)));
      if (active?.id === id) setActive(updated);
      toast.success(status === 'approved' ? 'Timesheet approved' : 'Timesheet rejected');
    } catch (err) { toast.error(err.message); }
  };

  const remove = async (t) => {
    const ok = await confirm({ title: 'Delete timesheet?', message: `${t.candidate_name}'s entry for the week of ${t.week_start} will be permanently removed.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await apiFetch(`/admin/timesheets/${t.id}`, { method: 'DELETE' });
      toast.success('Timesheet deleted');
      setActive(null); await load();
    } catch (err) { toast.error(err.message); }
  };

  const copyLink = async (applicationId) => {
    try {
      const r = await apiFetch(`/admin/applicants/${applicationId}/timesheet-link`);
      await navigator.clipboard?.writeText(r.url);
      toast.success('Timesheet link copied');
    } catch (err) { toast.error(err.message); }
  };

  const payrollExport = async (status = 'approved') => {
    const token = localStorage.getItem('tf_admin_token');
    const res = await fetch(`/api/admin/timesheets/payroll-export?status=${status}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return toast.error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payroll-${status}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Payroll CSV exported');
  };

  const generateInvoices = async () => {
    const ok = await confirm({ title: 'Generate client invoices?', message: 'Creates one draft invoice per employer from all approved, not-yet-invoiced timesheets (hours × bill rate).', confirmLabel: 'Generate' });
    if (!ok) return;
    setGenerating(true);
    try {
      const r = await apiFetch('/admin/timesheets/generate-invoices', { method: 'POST', body: JSON.stringify({}) });
      if (r.invoices.length === 0) toast.info('No approved, billable timesheets to invoice');
      else {
        const total = r.invoices.reduce((t, i) => t + i.amount, 0);
        toast.success(`Created ${r.invoices.length} invoice${r.invoices.length > 1 ? 's' : ''} totaling ${money(total)}`);
      }
      await load();
    } catch (err) { toast.error(err.message); }
    setGenerating(false);
  };

  const q = query.trim().toLowerCase();
  const shown = useMemo(() => {
    return timesheets
      .filter((t) => filter === 'all' || t.status === filter)
      .filter((t) => !q || `${t.candidate_name} ${t.job_title} ${t.company || ''}`.toLowerCase().includes(q));
  }, [timesheets, filter, q]);

  const stats = useMemo(() => {
    const pending = timesheets.filter((t) => t.status === 'submitted');
    const approved = timesheets.filter((t) => t.status === 'approved');
    const payrollDue = approved.reduce((t, x) => t + (x.pay_amount || 0), 0);
    const billDue = approved.reduce((t, x) => t + (x.bill_amount || 0), 0);
    return { pendingCount: pending.length, approvedHours: approved.reduce((t, x) => t + x.hours, 0), payrollDue, margin: billDue - payrollDue };
  }, [timesheets]);

  const totalHours = (h) => DAYS.reduce((t, d) => t + (Number(h[d.key]) || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatCard label="Pending Review" value={stats.pendingCount} icon="solar:clock-circle-bold" accent="amber" />
        <StatCard label="Approved Hours" value={stats.approvedHours} icon="solar:hourglass-line-bold" accent="sky" sub="not yet invoiced" />
        <StatCard label="Payroll Due" value={money(stats.payrollDue)} icon="solar:wallet-money-bold" accent="emerald" sub="approved, unbilled" />
        <StatCard label="Margin (approved)" value={money(stats.margin)} icon="solar:chart-2-bold" accent="violet" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-zinc-950/[0.04] dark:bg-white/[0.04] p-1 ring-1 ring-zinc-950/10 dark:ring-white/10">
          {['all', ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium capitalize transition ${filter === s ? 'bg-zinc-950/10 dark:bg-white/10 text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
            >
              {s} {s !== 'all' && <span className="text-zinc-400 dark:text-zinc-600">({timesheets.filter((t) => t.status === s).length})</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search timesheets…" />
          <Button variant="ghost" icon="solar:download-minimalistic-linear" onClick={() => payrollExport('approved')}>Payroll Export</Button>
          <Button variant="ghost" icon="solar:bill-list-linear" onClick={generateInvoices} disabled={generating}>{generating ? 'Generating…' : 'Generate Invoices'}</Button>
          <Button icon="solar:add-circle-linear" onClick={openNew}>New Timesheet</Button>
        </div>
      </div>

      <GlassCard>
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : shown.length === 0 ? (
          <EmptyState icon="solar:clock-square-linear" title={q || filter !== 'all' ? 'No matching timesheets' : 'No timesheets yet'} hint="Hired candidates submit hours via their personal link, or record them manually." action={!q && filter === 'all' && <Button icon="solar:add-circle-linear" onClick={openNew}>New Timesheet</Button>} />
        ) : (
          <Table columns={[
            { label: 'Candidate' }, { label: 'Role' }, { label: 'Week' }, { label: 'Hours', align: 'right' },
            { label: 'Pay', align: 'right' }, { label: 'Bill', align: 'right' }, { label: 'Status' }, { label: '', align: 'right' },
          ]}>
            {shown.map((t) => (
              <tr key={t.id} className="group cursor-pointer transition hover:bg-zinc-950/[0.03] dark:hover:bg-white/[0.03]" onClick={() => setActive(t)}>
                <td className="px-5 py-3.5 font-medium text-zinc-900 dark:text-white">{t.candidate_name}</td>
                <td className="px-5 py-3.5">
                  <div className="text-zinc-700 dark:text-zinc-300">{t.job_title}</div>
                  <div className="text-xs text-zinc-500">{t.company || '—'}</div>
                </td>
                <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">{t.week_start}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-zinc-800 dark:text-zinc-200">{t.hours}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-zinc-600 dark:text-zinc-400">{t.pay_amount != null ? money(t.pay_amount) : '—'}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-emerald-600 dark:text-emerald-300">{t.bill_amount != null ? money(t.bill_amount) : '—'}</td>
                <td className="px-5 py-3.5"><StatusBadge status={t.status} /></td>
                <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                    {t.status === 'submitted' && (
                      <>
                        <IconButton icon="solar:check-circle-linear" title="Approve" onClick={() => review(t.id, 'approved')} />
                        <IconButton icon="solar:close-circle-linear" title="Reject" variant="danger" onClick={() => review(t.id, 'rejected')} />
                      </>
                    )}
                    <IconButton icon="solar:eye-linear" title="View" onClick={() => setActive(t)} />
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </GlassCard>

      {/* Detail drawer */}
      <Drawer open={!!active} onClose={() => setActive(null)} title="Timesheet" width="max-w-lg">
        {active && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-zinc-950/5 dark:bg-white/5 text-lg font-semibold text-zinc-900 dark:text-white ring-1 ring-zinc-950/10 dark:ring-white/10">
                {active.candidate_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{active.candidate_name}</h3>
                <div className="text-sm text-zinc-500">{active.job_title} · {active.company || '—'}</div>
              </div>
              <StatusBadge status={active.status} />
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {DAYS.map((d) => (
                <div key={d.key} className="rounded-xl border border-zinc-950/10 dark:border-white/10 bg-zinc-950/[0.03] dark:bg-white/[0.03] py-2 text-center">
                  <div className="text-[10px] uppercase text-zinc-500">{d.label}</div>
                  <div className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-white">{active.daily_hours?.[d.key] || 0}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-zinc-950/10 dark:border-white/10 bg-zinc-950/[0.03] dark:bg-white/[0.03] p-3 text-center">
                <div className="text-lg font-semibold text-zinc-900 dark:text-white">{active.hours}</div>
                <div className="text-[11px] uppercase tracking-wide text-zinc-500">Hours</div>
              </div>
              <div className="rounded-xl border border-zinc-950/10 dark:border-white/10 bg-zinc-950/[0.03] dark:bg-white/[0.03] p-3 text-center">
                <div className="text-lg font-semibold text-zinc-900 dark:text-white">{active.pay_amount != null ? money(active.pay_amount) : '—'}</div>
                <div className="text-[11px] uppercase tracking-wide text-zinc-500">Payroll</div>
              </div>
              <div className="rounded-xl border border-zinc-950/10 dark:border-white/10 bg-zinc-950/[0.03] dark:bg-white/[0.03] p-3 text-center">
                <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-300">{active.bill_amount != null ? money(active.bill_amount) : '—'}</div>
                <div className="text-[11px] uppercase tracking-wide text-zinc-500">Client Bill</div>
              </div>
            </div>

            {active.notes && (
              <div className="rounded-xl border border-zinc-950/10 dark:border-white/10 bg-zinc-950/[0.03] dark:bg-white/[0.03] p-3 text-sm text-zinc-700 dark:text-zinc-300">{active.notes}</div>
            )}

            {active.status === 'submitted' && (
              <div className="flex gap-2">
                <Button icon="solar:check-circle-linear" onClick={() => review(active.id, 'approved')} className="flex-1 justify-center">Approve</Button>
                <Button variant="danger" icon="solar:close-circle-linear" onClick={() => review(active.id, 'rejected')} className="flex-1 justify-center">Reject</Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" icon="solar:link-circle-linear" onClick={() => copyLink(active.application_id)} className="flex-1 justify-center">Copy Link</Button>
              <Button variant="danger" icon="solar:trash-bin-trash-linear" onClick={() => remove(active)} className="flex-1 justify-center">Delete</Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Manual entry drawer */}
      <Drawer open={editing === 'new'} onClose={() => setEditing(null)} title="Record Timesheet" width="max-w-lg">
        <form onSubmit={save} className="space-y-4">
          <Field label="Candidate" hint="only hired candidates can log hours">
            <Select required value={form.application_id} onChange={(e) => setForm({ ...form, application_id: e.target.value })}>
              <option value="">— Select —</option>
              {hiredApplicants.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.job_title}</option>)}
            </Select>
          </Field>
          <Field label="Week Starting">
            <Input type="date" required value={form.week_start} onChange={(e) => setForm({ ...form, week_start: e.target.value })} />
          </Field>
          <div>
            <span className="mb-2 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Hours Worked</span>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS.map((d) => (
                <div key={d.key} className="text-center">
                  <span className="mb-1 block text-[10px] uppercase text-zinc-500">{d.label}</span>
                  <input
                    type="number" min="0" max="24" step="0.5"
                    value={form.hours[d.key]}
                    onChange={(e) => setForm({ ...form, hours: { ...form.hours, [d.key]: e.target.value } })}
                    placeholder="0"
                    className="w-full rounded-lg border border-zinc-950/10 dark:border-white/10 bg-zinc-950/[0.04] dark:bg-white/[0.04] px-1.5 py-2 text-center text-sm text-zinc-900 dark:text-white outline-none focus:border-sky-400/50"
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-500">Total: <span className="font-medium text-zinc-800 dark:text-zinc-200">{totalHours(form.hours)} hrs</span></p>
          </div>
          <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Timesheet'}</Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
