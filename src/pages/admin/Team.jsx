import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import {
  GlassCard, Table, StatusBadge, Button, IconButton, Drawer, Field, Input, Select,
  Spinner, EmptyState, relativeDate,
} from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';
import { useConfirm } from '../../components/admin/Confirm';
import { useAuth } from '../../hooks/useAuth';

const ROLES = ['owner', 'recruiter', 'viewer'];
const ROLE_LABELS = { owner: 'Owner', recruiter: 'Recruiter', viewer: 'Viewer' };
const ROLE_HINTS = {
  owner: 'Full access — billing, settings, QuickBooks, and team management.',
  recruiter: 'Day-to-day ATS access — jobs, applicants, employers, timesheets. No billing or settings.',
  viewer: 'Read-only access everywhere.',
};
const blank = { name: '', email: '', role: 'recruiter', password: '' };

export default function Team() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // 'new' | member object
  const [resetting, setResetting] = useState(null); // member object
  const [form, setForm] = useState(blank);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();

  const load = async () => {
    setLoading(true);
    setMembers(await apiFetch('/admin/team'));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(blank); setEditing('new'); };
  const openEdit = (m) => { setForm({ name: m.name, email: m.email, role: m.role, password: '' }); setEditing(m); };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing === 'new') {
        await apiFetch('/admin/team', { method: 'POST', body: JSON.stringify(form) });
        toast.success('Team member added');
      } else {
        await apiFetch(`/admin/team/${editing.id}`, { method: 'PUT', body: JSON.stringify({ name: form.name, role: form.role }) });
        toast.success('Team member updated');
      }
      setEditing(null); await load();
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  };

  const toggleActive = async (m) => {
    try {
      await apiFetch(`/admin/team/${m.id}`, { method: 'PUT', body: JSON.stringify({ active: !m.active }) });
      toast.success(m.active ? 'Team member deactivated' : 'Team member reactivated');
      await load();
    } catch (err) { toast.error(err.message); }
  };

  const remove = async (m) => {
    const ok = await confirm({ title: 'Remove team member?', message: `"${m.name}" will lose access immediately.`, confirmLabel: 'Remove', danger: true });
    if (!ok) return;
    try {
      await apiFetch(`/admin/team/${m.id}`, { method: 'DELETE' });
      toast.success('Team member removed');
      await load();
    } catch (err) { toast.error(err.message); }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/admin/team/${resetting.id}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) });
      toast.success(`Password reset for ${resetting.name}`);
      setResetting(null); setPassword('');
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">{members.length} team {members.length === 1 ? 'member' : 'members'} on this account</p>
        <Button icon="solar:user-plus-linear" onClick={openNew}>Add Team Member</Button>
      </div>

      <GlassCard>
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : members.length === 0 ? (
          <EmptyState icon="solar:users-group-rounded-linear" title="No team members yet" hint="Add recruiters and read-only viewers under your account." action={<Button icon="solar:user-plus-linear" onClick={openNew}>Add Team Member</Button>} />
        ) : (
          <Table columns={[
            { label: 'Name' }, { label: 'Email' }, { label: 'Role' }, { label: 'Status' }, { label: 'Last Login' }, { label: '', align: 'right' },
          ]}>
            {members.map((m) => {
              const isSelf = m.id === user?.id;
              return (
                <tr key={m.id} className="group transition hover:bg-zinc-950/[0.03] dark:hover:bg-white/[0.03]">
                  <td className="px-5 py-3.5 font-medium text-zinc-900 dark:text-white">
                    {m.name}{isSelf && <span className="ml-2 text-xs font-normal text-zinc-500">(you)</span>}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">{m.email}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={m.role} /></td>
                  <td className="px-5 py-3.5"><StatusBadge status={m.active ? 'active' : 'inactive'} /></td>
                  <td className="px-5 py-3.5 text-zinc-500">{relativeDate(m.last_login_at)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                      <IconButton icon="solar:pen-linear" title="Edit" onClick={() => openEdit(m)} />
                      <IconButton icon="solar:key-linear" title="Reset password" onClick={() => { setResetting(m); setPassword(''); }} />
                      <IconButton
                        icon={m.active ? 'solar:eye-closed-linear' : 'solar:eye-linear'}
                        title={isSelf ? "You can't deactivate your own account" : m.active ? 'Deactivate' : 'Reactivate'}
                        disabled={isSelf}
                        onClick={() => toggleActive(m)}
                      />
                      <IconButton
                        icon="solar:trash-bin-trash-linear"
                        title={isSelf ? "You can't remove your own account" : 'Remove'}
                        variant="danger"
                        disabled={isSelf}
                        onClick={() => remove(m)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </GlassCard>

      {/* Create / edit drawer */}
      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add Team Member' : `Edit · ${editing?.name || ''}`}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Full Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" /></Field>
          <Field label="Email">
            <Input type="email" required disabled={editing !== 'new'} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@youragency.com" />
          </Field>
          {editing === 'new' && (
            <Field label="Initial Password" hint="At least 8 characters — share it with them directly.">
              <Input required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Temporary password" />
            </Field>
          )}
          <Field label="Role" hint={ROLE_HINTS[form.role]}>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editing === 'new' ? 'Add Team Member' : 'Save Changes'}</Button>
          </div>
        </form>
      </Drawer>

      {/* Reset password drawer */}
      <Drawer open={!!resetting} onClose={() => setResetting(null)} title={`Reset Password · ${resetting?.name || ''}`} width="max-w-md">
        <form onSubmit={resetPassword} className="space-y-4">
          <Field label="New Password" hint="At least 8 characters — share it with them directly.">
            <Input required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New temporary password" autoFocus />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setResetting(null)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Reset Password'}</Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
