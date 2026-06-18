import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import {
  GlassCard, Table, StatusBadge, Button, IconButton, Drawer, Field, Input, Select, Textarea,
  Spinner, EmptyState, Icon, SearchInput,
} from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';
import { useConfirm } from '../../components/admin/Confirm';

const TYPES = ['Full-Time', 'Part-Time', 'Contract'];
const STATUSES = ['active', 'closed', 'draft'];
const blankJob = { title: '', employer_id: '', location: 'Your City, ST', type: 'Full-Time', rate: '', bill_rate: '', status: 'active', description: '', requirements: '' };

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankJob);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const [j, e] = await Promise.all([apiFetch('/admin/jobs'), apiFetch('/admin/employers')]);
    setJobs(j); setEmployers(e);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { setQuery(searchParams.get('q') || ''); }, [searchParams]);

  const openNew = () => { setForm(blankJob); setEditing('new'); };
  const openEdit = (job) => {
    setForm({
      title: job.title, employer_id: job.employer_id || '', location: job.location, type: job.type,
      rate: job.rate ?? '', bill_rate: job.bill_rate ?? '', status: job.status,
      description: job.description || '', requirements: job.requirements || '',
    });
    setEditing(job);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      employer_id: form.employer_id || null,
      rate: form.rate === '' ? null : Number(form.rate),
      bill_rate: form.bill_rate === '' ? null : Number(form.bill_rate),
    };
    try {
      if (editing === 'new') await apiFetch('/admin/jobs', { method: 'POST', body: JSON.stringify(payload) });
      else await apiFetch(`/admin/jobs/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      toast.success(editing === 'new' ? 'Job posted' : 'Job updated');
      setEditing(null);
      await load();
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  };

  const remove = async (job) => {
    const ok = await confirm({ title: 'Delete job posting?', message: `“${job.title}” and all of its applications will be permanently removed.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await apiFetch(`/admin/jobs/${job.id}`, { method: 'DELETE' });
      toast.success('Job deleted');
      await load();
    } catch (err) { toast.error(err.message); }
  };

  const q = query.trim().toLowerCase();
  const shown = jobs
    .filter((j) => filter === 'all' || j.status === filter)
    .filter((j) => !q || `${j.title} ${j.company || ''} ${j.location} ${j.type}`.toLowerCase().includes(q));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1 ring-1 ring-white/10">
          {['all', ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium capitalize transition ${filter === s ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              {s} {s !== 'all' && <span className="text-zinc-600">({jobs.filter((j) => j.status === s).length})</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search jobs…" />
          <Button icon="solar:add-circle-linear" onClick={openNew}>New Job</Button>
        </div>
      </div>

      <GlassCard>
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : shown.length === 0 ? (
          <EmptyState icon="solar:case-minimalistic-linear" title={q ? 'No matching jobs' : 'No job postings'} hint={q ? 'Try a different search.' : 'Create your first posting to start sourcing.'} action={!q && <Button icon="solar:add-circle-linear" onClick={openNew}>New Job</Button>} />
        ) : (
          <Table columns={[
            { label: 'Title' }, { label: 'Company' }, { label: 'Location' }, { label: 'Type' },
            { label: 'Rate' }, { label: 'Applicants' }, { label: 'Status' }, { label: 'Posted' }, { label: '', align: 'right' },
          ]}>
            {shown.map((j) => (
              <tr key={j.id} className="group transition hover:bg-white/[0.03]">
                <td className="px-5 py-3.5 font-medium text-white">{j.title}</td>
                <td className="px-5 py-3.5 text-zinc-400">{j.company || '—'}</td>
                <td className="px-5 py-3.5 text-zinc-400">{j.location}</td>
                <td className="px-5 py-3.5 text-zinc-400">{j.type}</td>
                <td className="px-5 py-3.5 text-emerald-300">{j.rate != null ? `$${j.rate}/hr` : '—'}</td>
                <td className="px-5 py-3.5">
                  <button onClick={() => navigate(`/admin/applicants?q=${encodeURIComponent(j.title)}`)} className="text-zinc-300 underline-offset-2 hover:text-sky-300 hover:underline">
                    {j.applicant_count}
                  </button>
                </td>
                <td className="px-5 py-3.5"><StatusBadge status={j.status} /></td>
                <td className="px-5 py-3.5 text-zinc-500">{(j.created_at || '').slice(0, 10)}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                    <IconButton icon="solar:users-group-rounded-linear" title="View applicants" onClick={() => navigate(`/admin/applicants?q=${encodeURIComponent(j.title)}`)} />
                    <IconButton icon="solar:pen-linear" title="Edit" onClick={() => openEdit(j)} />
                    <IconButton icon="solar:trash-bin-trash-linear" title="Delete" variant="danger" onClick={() => remove(j)} />
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </GlassCard>

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New Job Posting' : `Edit · ${editing?.title || ''}`}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Job Title"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Warehouse Associate" /></Field>
          <Field label="Employer">
            <Select value={form.employer_id} onChange={(e) => setForm({ ...form, employer_id: e.target.value })}>
              <option value="">— None —</option>
              {employers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
            <Field label="Type"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Pay Rate ($/hr)" hint="paid to worker"><Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} /></Field>
            <Field label="Bill Rate ($/hr)" hint="charged to client"><Input type="number" step="0.01" value={form.bill_rate} onChange={(e) => setForm({ ...form, bill_rate: e.target.value })} /></Field>
            <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}</Select></Field>
          </div>
          {form.rate && form.bill_rate && Number(form.bill_rate) > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300 ring-1 ring-emerald-400/20">
              <Icon name="solar:money-bag-bold" className="text-sm" />
              Gross margin: {Math.round(((form.bill_rate - form.rate) / form.bill_rate) * 100)}% · ${(form.bill_rate - form.rate).toFixed(2)}/hr spread
            </div>
          )}
          <Field label="Description"><Textarea rows={4} required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Requirements"><Textarea rows={3} value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Job'}</Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
