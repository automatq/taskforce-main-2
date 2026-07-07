import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { Icon, StatusBadge, Button, Field, Input } from './ui';
import { useToast } from './Toast';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || name[0].toUpperCase();
}

export default function UserMenu() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
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
        className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-zinc-300 to-zinc-400 text-xs font-semibold text-zinc-900 ring-1 ring-zinc-950/10 transition hover:ring-zinc-950/20 dark:from-zinc-700 dark:to-zinc-800 dark:text-white dark:ring-white/10 dark:hover:ring-white/20"
      >
        {initials(user.name)}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-40 w-72 rounded-2xl border border-zinc-200 bg-white/95 p-4 backdrop-blur-2xl shadow-[0_24px_80px_-20px_rgba(0,0,0,0.25)] dark:border-white/10 dark:bg-zinc-950/95 dark:shadow-[0_24px_80px_-20px_rgba(0,0,0,0.8)] animate-[slideIn_.15s_ease]">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-zinc-300 to-zinc-400 text-sm font-semibold text-zinc-900 ring-1 ring-zinc-950/10 dark:from-zinc-700 dark:to-zinc-800 dark:text-white dark:ring-white/10">
              {initials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-zinc-900 dark:text-white">{user.name}</div>
              <div className="truncate text-xs text-zinc-500">{user.email}</div>
            </div>
            <StatusBadge status={user.role} />
          </div>

          {!changingPassword ? (
            <div className="mt-4 space-y-1 border-t border-zinc-200 pt-3 dark:border-white/10">
              <div className="flex items-center justify-between px-2.5 py-1.5">
                <span className="flex items-center gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
                  <Icon name="solar:sun-2-linear" className="text-base" /> Theme
                </span>
                <div className="flex items-center gap-0.5 rounded-full bg-zinc-950/5 p-1 dark:bg-white/5">
                  <button
                    onClick={() => setTheme('light')}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                      theme === 'light' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                      theme === 'dark' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    Dark
                  </button>
                </div>
              </div>
              <button
                onClick={() => setChangingPassword(true)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-950/5 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <Icon name="solar:key-linear" className="text-base" /> Change Password
              </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-950/5 hover:text-rose-600 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-rose-300"
              >
                <Icon name="solar:logout-2-linear" className="text-base" /> Sign Out
              </button>
            </div>
          ) : (
            <form onSubmit={submitPasswordChange} className="mt-4 space-y-3 border-t border-zinc-200 pt-3 dark:border-white/10">
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
