import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import {
  GlassCard, StatCard, Table, StatusBadge, Button, IconButton, Drawer, Field, Input, Select,
  Spinner, EmptyState, SearchInput, money,
} from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';
import { useConfirm } from '../../components/admin/Confirm';

const STATUSES = ['draft', 'sent', 'paid', 'overdue'];
const blank = { employer_id: '', number: '', amount: '', status: 'draft', issued_at: '', due_at: '' };

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    const [i, e] = await Promise.all([apiFetch('/admin/invoices'), apiFetch('/admin/employers')]);
    setInvoices(i); setEmployers(e); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(blank); setEditing('new'); };
  const openEdit = (v) => {
    setForm({ employer_id: v.employer_id || '', number: v.number || '', amount: v.amount ?? '', status: v.status, issued_at: v.issued_at || '', due_at: v.due_at || '' });
    setEditing(v);
  };

  const save = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    const payload = { ...form, employer_id: Number(form.employer_id), amount: Number(form.amount) || 0 };
    try {
      if (editing === 'new') await apiFetch('/admin/invoices', { method: 'POST', body: JSON.stringify(payload) });
      else await apiFetch(`/admin/invoices/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      toast.success(editing === 'new' ? 'Invoice created' : 'Invoice updated');
      setEditing(null); await load();
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  };

  const markPaid = async (v) => {
    try {
      await apiFetch(`/admin/invoices/${v.id}`, { method: 'PUT', body: JSON.stringify({ ...v, status: 'paid' }) });
      toast.success(`${v.number} marked paid`);
      await load();
    } catch (err) { toast.error(err.message); }
  };

  const remove = async (v) => {
    const ok = await confirm({ title: 'Delete invoice?', message: `${v.number} (${money(v.amount)}) will be permanently removed.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await apiFetch(`/admin/invoices/${v.id}`, { method: 'DELETE' });
      toast.success('Invoice deleted');
      await load();
    } catch (err) { toast.error(err.message); }
  };

  const sum = (st) => invoices.filter((i) => st.includes(i.status)).reduce((t, i) => t + i.amount, 0);
  const q = query.trim().toLowerCase();
  const shown = invoices
    .filter((v) => filter === 'all' || v.status === filter)
    .filter((v) => !q || `${v.number} ${v.company || ''}`.toLowerCase().includes(q));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatCard label="Paid" value={money(sum(['paid']))} icon="solar:check-circle-bold" accent="emerald" />
        <StatCard label="Sent" value={money(sum(['sent']))} icon="solar:plain-bold" accent="sky" />
        <StatCard label="Overdue" value={money(sum(['overdue']))} icon="solar:danger-triangle-bold" accent="rose" />
        <StatCard label="Outstanding" value={money(sum(['sent', 'overdue']))} icon="solar:bill-list-bold" accent="amber" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1 ring-1 ring-white/10">
          {['all', ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium capitalize transition ${filter === s ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              {s} {s !== 'all' && <span className="text-zinc-600">({invoices.filter((i) => i.status === s).length})</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search invoices…" />
          <Button icon="solar:add-circle-linear" onClick={openNew}>New Invoice</Button>
        </div>
      </div>

      <GlassCard>
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : shown.length === 0 ? (
          <EmptyState icon="solar:card-linear" title={q || filter !== 'all' ? 'No matching invoices' : 'No invoices yet'} hint="Bill your client companies for placements and time worked." action={!q && filter === 'all' && <Button icon="solar:add-circle-linear" onClick={openNew}>New Invoice</Button>} />
        ) : (
          <Table columns={[
            { label: 'Invoice' }, { label: 'Company' }, { label: 'Amount', align: 'right' }, { label: 'Status' }, { label: 'Issued' }, { label: 'Due' }, { label: '', align: 'right' },
          ]}>
            {shown.map((v) => (
              <tr key={v.id} className="group transition hover:bg-white/[0.03]">
                <td className="px-5 py-3.5 font-medium text-white">{v.number}</td>
                <td className="px-5 py-3.5 text-zinc-300">{v.company || '—'}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-white">{money(v.amount)}</td>
                <td className="px-5 py-3.5"><StatusBadge status={v.status} /></td>
                <td className="px-5 py-3.5 text-zinc-500">{v.issued_at || '—'}</td>
                <td className="px-5 py-3.5 text-zinc-500">{v.due_at || '—'}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                    {v.status !== 'paid' && <IconButton icon="solar:check-circle-linear" title="Mark paid" onClick={() => markPaid(v)} />}
                    <IconButton icon="solar:pen-linear" title="Edit" onClick={() => openEdit(v)} />
                    <IconButton icon="solar:trash-bin-trash-linear" title="Delete" variant="danger" onClick={() => remove(v)} />
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </GlassCard>

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New Invoice' : `Edit · ${editing?.number || ''}`} width="max-w-md">
        <form onSubmit={save} className="space-y-4">
          <Field label="Employer">
            <Select required value={form.employer_id} onChange={(e) => setForm({ ...form, employer_id: e.target.value })}>
              <option value="">— Select —</option>
              {employers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Invoice #" hint="auto if blank"><Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="INV-1007" /></Field>
            <Field label="Amount (CAD)"><Input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          </div>
          <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}</Select></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Issued"><Input type="date" value={form.issued_at || ''} onChange={(e) => setForm({ ...form, issued_at: e.target.value })} /></Field>
            <Field label="Due"><Input type="date" value={form.due_at || ''} onChange={(e) => setForm({ ...form, due_at: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Invoice'}</Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
