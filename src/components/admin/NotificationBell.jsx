import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { Icon, EmptyState, relativeDate } from './ui';

const TYPE_ICON = {
  new_applicant: 'solar:user-plus-bold-duotone',
  hired: 'solar:check-circle-bold-duotone',
  job_filled: 'solar:flag-bold-duotone',
};
const POLL_MS = 30000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();

  const load = useCallback(() => {
    apiFetch('/admin/notifications')
      .then((r) => { setItems(r.notifications); setUnread(r.unread_count); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const openItem = (n) => {
    setOpen(false);
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      apiFetch(`/admin/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {});
    }
    if (n.link) navigate(n.link);
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnread(0);
    try { await apiFetch('/admin/notifications/read-all', { method: 'POST' }); } catch { load(); }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 place-items-center rounded-full text-zinc-500 transition hover:bg-zinc-950/[0.07] hover:text-zinc-700 dark:hover:bg-white/[0.07] dark:hover:text-zinc-300"
      >
        <Icon name="solar:bell-linear" className="text-lg" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white dark:ring-zinc-950">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-40 w-96 rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-2xl shadow-[0_24px_80px_-20px_rgba(0,0,0,0.25)] dark:border-white/10 dark:bg-zinc-950/95 dark:shadow-[0_24px_80px_-20px_rgba(0,0,0,0.8)] animate-[slideIn_.15s_ease]">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-white/10">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Notifications</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200">Mark all read</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <EmptyState icon="solar:bell-linear" title="No notifications yet" hint="New applicants and hires will show up here." />
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`flex w-full items-start gap-3 border-b border-zinc-950/[0.04] px-4 py-3 text-left transition last:border-0 hover:bg-zinc-950/[0.03] dark:border-white/[0.04] dark:hover:bg-white/[0.03] ${!n.read ? 'bg-sky-500/[0.04]' : ''}`}
                >
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-950/5 text-zinc-500 ring-1 ring-zinc-950/10 dark:bg-white/5 dark:text-zinc-400 dark:ring-white/10">
                    <Icon name={TYPE_ICON[n.type] || 'solar:bell-bold-duotone'} className="text-base" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-900 dark:text-white">{n.title}</span>
                    {n.body && <span className="block truncate text-xs text-zinc-500">{n.body}</span>}
                    <span className="mt-0.5 block text-[11px] text-zinc-400 dark:text-zinc-600">{relativeDate(n.created_at)}</span>
                  </span>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-500" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
