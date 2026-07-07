import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { Icon, StatusBadge, Button, Field, Input } from './ui';
import { useToast } from './Toast';
import { useAuth } from '../../hooks/useAuth';

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || name[0].toUpperCase();
}

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setChangingPassword(false); } };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;

  const handleLogout = () => { logout(); navigate('/admin'); };

  const submitPasswordChange = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/admin/me/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) });
      toast.success('Password updated');
      setChangingPassword(false); setCurrentPassword(''); setNewPassword('');
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 text-xs font-semibold text-white ring-1 ring-white/10 transition hover:ring-white/20"
      >
        {initials(user.name)}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-40 w-72 rounded-2xl border border-white/10 bg-zinc-950/95 p-4 backdrop-blur-2xl shadow-[0_24px_80px_-20px_rgba(0,0,0,0.8)] animate-[slideIn_.15s_ease]">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 text-sm font-semibold text-white ring-1 ring-white/10">
              {initials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{user.name}</div>
              <div className="truncate text-xs text-zinc-500">{user.email}</div>
            </div>
            <StatusBadge status={user.role} />
          </div>

          {!changingPassword ? (
            <div className="mt-4 space-y-1 border-t border-white/10 pt-3">
              <button
                onClick={() => setChangingPassword(true)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
              >
                <Icon name="solar:key-linear" className="text-base" /> Change Password
              </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-300 transition hover:bg-white/5 hover:text-rose-300"
              >
                <Icon name="solar:logout-2-linear" className="text-base" /> Sign Out
              </button>
            </div>
          ) : (
            <form onSubmit={submitPasswordChange} className="mt-4 space-y-3 border-t border-white/10 pt-3">
              <Field label="Current Password">
                <Input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoFocus />
              </Field>
              <Field label="New Password" hint="At least 8 characters.">
                <Input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </Field>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" onClick={() => setChangingPassword(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Update'}</Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
