import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import {
  GlassCard, Table, StatusBadge, Button, IconButton, Drawer, Field, Input, Select,
  Textarea, Spinner, EmptyState, Icon, SearchInput, money,
} from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';
import { useConfirm } from '../../components/admin/Confirm';
import { useAuth } from '../../hooks/useAuth';

const PLANS = ['Trial', 'Basic', 'Pro'];
const blank = { name: '', contact_name: '', contact_email: '', phone: '', plan: 'Trial', since: '', notes: '' };

export default function Employers() {
  const [employers, setEmployers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [editing, setEditing] = useState(null);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { isOwner } = useAuth();

  const load = async () => {
    setLoading(true);
    try {
      // /admin/invoices is owner-only — recruiters/viewers see everything
      // else on this page, just not billing totals.
      const [e, j, v] = await Promise.all([
        apiFetch('/admin/employers'), apiFetch('/admin/jobs'),
        isOwner ? apiFetch('/admin/invoices') : Promise.resolve([]),
      ]);
      setEmployers(e); setJobs(j); setInvoices(v);
    } catch (err) {
      toast.error(err.message);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [isOwner]);
  useEffect(() => { setQuery(searchParams.get('q') || ''); }, [searchParams]);

  const openNew = () => { setForm(blank); setEditing('new'); };
  const openEdit = (e) => {
    setForm({ name: e.name, contact_name: e.contact_name || '', contact_email: e.contact_email || '', phone: e.phone || '', plan: e.plan || 'Trial', since: e.since || '', notes: e.notes || '' });
    setEditing(e);
  };

  const save = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    const payload = { ...form, since: form.since === '' ? null : Number(form.since) };
    try {
      if (editing === 'new') await apiFetch('/admin/employers', { method: 'POST', body: JSON.stringify(payload) });
      else await apiFetch(`/admin/employers/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      toast.success(editing === 'new' ? 'Employer added' : 'Employer updated');
      setEditing(null); await load();
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  };

  const remove = async (e) => {
    const ok = await confirm({ title: 'Delete employer?', message: `“${e.name}” will be removed and its jobs unlinked. Employers with any invoices on file can't be deleted — remove those first.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await apiFetch(`/admin/employers/${e.id}`, { method: 'DELETE' });
      toast.success('Employer deleted');
      setProfile(null); await load();
    } catch (err) { toast.error(err.message); }
  };

  const q = query.trim().toLowerCase();
  const shown = employers.filter((e) => !q || `${e.name} ${e.contact_name || ''} ${e.contact_email || ''}`.toLowerCase().includes(q));
  const empJobs = profile ? jobs.filter((j) => j.employer_id === profile.id) : [];
  const empInvoices = profile ? invoices.filter((v) => v.employer_id === profile.id) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">{employers.length} client companies</p>
        <div className="flex items-center gap-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search employers…" />
          <Button icon="solar:add-circle-linear" onClick={openNew}>New Employer</Button>
        </div>
      </div>

      <GlassCard>
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : shown.length === 0 ? (
          <EmptyState icon="solar:buildings-2-linear" title={q ? 'No matching employers' : 'No employers yet'} hint="Add your client companies to track open roles and billing." action={!q && <Button icon="solar:add-circle-linear" onClick={openNew}>New Employer</Button>} />
        ) : (
          <Table columns={[
            { label: 'Company' }, { label: 'Contact' }, { label: 'Email' }, { label: 'Open Roles' }, { label: 'Plan' }, { label: 'Since' }, { label: '', align: 'right' },
          ]}>
            {shown.map((e) => (
              <tr key={e.id} className="group cursor-pointer transition hover:bg-zinc-950/[0.03] dark:hover:bg-white/[0.03]" onClick={() => setProfile(e)}>
                <td className="px-5 py-3.5 font-medium text-zinc-900 dark:text-white">{e.name}</td>
                <td className="px-5 py-3.5 text-zinc-700 dark:text-zinc-300">{e.contact_name || '—'}</td>
                <td className="px-5 py-3.5 text-zinc-500">{e.contact_email || '—'}</td>
                <td className="px-5 py-3.5"><span className="text-zinc-800 dark:text-zinc-200">{e.open_roles}</span> <span className="text-xs text-zinc-400 dark:text-zinc-600">of {e.total_jobs}</span></td>
                <td className="px-5 py-3.5"><StatusBadge status={e.plan} /></td>
                <td className="px-5 py-3.5 text-zinc-500">{e.since || '—'}</td>
                <td className="px-5 py-3.5" onClick={(ev) => ev.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                    <IconButton icon="solar:pen-linear" title="Edit" onClick={() => openEdit(e)} />
                    <IconButton icon="solar:trash-bin-trash-linear" title="Delete" variant="danger" onClick={() => remove(e)} />
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </GlassCard>

      {/* Profile drawer */}
      <Drawer open={!!profile} onClose={() => setProfile(null)} title="Employer Profile" width="max-w-lg">
        {profile && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-zinc-950/5 text-zinc-700 ring-1 ring-zinc-950/10 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10">
                <Icon name="solar:buildings-2-bold" className="text-2xl" />
              </span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{profile.name}</h3>
                <div className="text-sm text-zinc-500">{profile.contact_name || '—'}</div>
              </div>
              <StatusBadge status={profile.plan} />
            </div>

            <div className={`grid gap-3 ${isOwner ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <MiniStat label="Open Roles" value={profile.open_roles} />
              <MiniStat label="Total Jobs" value={profile.total_jobs} />
              {isOwner && <MiniStat label="Billed" value={money(empInvoices.reduce((t, v) => t + v.amount, 0))} />}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow icon="solar:letter-linear" label="Email" value={profile.contact_email ? <a href={`mailto:${profile.contact_email}`} className="text-sky-600 hover:underline dark:text-sky-300">{profile.contact_email}</a> : '—'} />
              <InfoRow icon="solar:phone-linear" label="Phone" value={profile.phone || '—'} />
              <InfoRow icon="solar:calendar-linear" label="Client Since" value={profile.since || '—'} />
              <InfoRow icon="solar:star-linear" label="Plan" value={profile.plan} />
            </div>

            {profile.notes && (
              <div className="rounded-xl border border-zinc-950/10 bg-zinc-950/[0.03] p-3 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300">{profile.notes}</div>
            )}

            <Section title="Jobs" action={empJobs.length > 0 && <button onClick={() => navigate(`/admin/jobs?q=${encodeURIComponent(profile.name)}`)} className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200">View →</button>}>
              {empJobs.length === 0 ? <Empty text="No jobs yet" /> : empJobs.map((j) => (
                <div key={j.id} className="flex items-center justify-between py-2">
                  <div><div className="text-sm text-zinc-900 dark:text-white">{j.title}</div><div className="text-xs text-zinc-500">{j.location} · {j.applicant_count} applicants</div></div>
                  <StatusBadge status={j.status} />
                </div>
              ))}
            </Section>

            {isOwner && (
              <Section title="Invoices" action={<button onClick={() => navigate('/admin/billing')} className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200">Billing →</button>}>
                {empInvoices.length === 0 ? <Empty text="No invoices yet" /> : empInvoices.map((v) => (
                  <div key={v.id} className="flex items-center justify-between py-2">
                    <div><div className="text-sm text-zinc-900 dark:text-white">{v.number}</div><div className="text-xs text-zinc-500">{v.issued_at || 'draft'}</div></div>
                    <div className="flex items-center gap-3"><span className="text-sm tabular-nums text-zinc-800 dark:text-zinc-200">{money(v.amount)}</span><StatusBadge status={v.status} /></div>
                  </div>
                ))}
              </Section>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" icon="solar:pen-linear" onClick={() => { setProfile(null); openEdit(profile); }} className="flex-1 justify-center">Edit</Button>
              <Button variant="danger" icon="solar:trash-bin-trash-linear" onClick={() => remove(profile)} className="flex-1 justify-center">Delete</Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Edit drawer */}
      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New Employer' : `Edit · ${editing?.name || ''}`}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Company Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Logistics" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Name"><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          </div>
          <Field label="Contact Email"><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Plan"><Select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>{PLANS.map((p) => <option key={p}>{p}</option>)}</Select></Field>
            <Field label="Client Since (year)"><Input type="number" value={form.since} onChange={(e) => setForm({ ...form, since: e.target.value })} placeholder="2024" /></Field>
          </div>
          <Field label="Notes"><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Account notes, preferences, history…" /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Employer'}</Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border border-zinc-950/10 bg-zinc-950/[0.03] p-3 text-center dark:border-white/10 dark:bg-white/[0.03]">
      <div className="text-lg font-semibold text-zinc-900 dark:text-white">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
    </div>
  );
}
function Section({ title, action, children }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h4>
        {action}
      </div>
      <div className="divide-y divide-zinc-950/[0.06] rounded-xl border border-zinc-950/10 bg-zinc-950/[0.02] px-3 dark:divide-white/[0.06] dark:border-white/10 dark:bg-white/[0.02]">{children}</div>
    </div>
  );
}
function Empty({ text }) { return <div className="py-3 text-center text-xs text-zinc-400 dark:text-zinc-600">{text}</div>; }
function InfoRow({ icon, label, value }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-zinc-500"><Icon name={icon} className="text-xs" /> {label}</div>
      <div className="truncate text-zinc-800 dark:text-zinc-200">{value}</div>
    </div>
  );
}
