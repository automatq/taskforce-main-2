import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Icon } from './ui';
import { ToastProvider } from './Toast';
import { ConfirmProvider } from './Confirm';
import GlobalSearch from './GlobalSearch';
import UserMenu from './UserMenu';

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'solar:widget-2-linear' },
  { to: '/admin/jobs', label: 'Job Postings', icon: 'solar:case-minimalistic-linear' },
  { to: '/admin/applicants', label: 'Applicants', icon: 'solar:users-group-rounded-linear' },
  { to: '/admin/agents', label: 'AI Agents', icon: 'solar:cpu-bolt-linear' },
  { to: '/admin/employers', label: 'Employers', icon: 'solar:buildings-2-linear' },
  { to: '/admin/timesheets', label: 'Timesheets', icon: 'solar:clock-square-linear' },
  { to: '/admin/billing', label: 'Billing', icon: 'solar:card-linear', ownerOnly: true },
  { to: '/admin/documents', label: 'Documents', icon: 'solar:document-text-linear' },
  { to: '/admin/settings', label: 'Settings', icon: 'solar:settings-linear', ownerOnly: true },
  { to: '/admin/team', label: 'Team', icon: 'solar:users-group-two-rounded-linear', ownerOnly: true },
];

export default function AdminLayout() {
  const { isAuthenticated, loading, isOwner } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate('/admin', { replace: true });
  }, [isAuthenticated, loading, navigate]);

  // Defense in depth: the sidebar already hides owner-only sections from
  // non-owners, but a direct URL visit should still bounce rather than render
  // a page whose API calls will just 403.
  useEffect(() => {
    if (loading || !isAuthenticated || isOwner) return;
    const current = NAV.find((n) => location.pathname.startsWith(n.to));
    if (current?.ownerOnly) navigate('/admin/dashboard', { replace: true });
  }, [location.pathname, isAuthenticated, isOwner, loading, navigate]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (loading || !isAuthenticated) return null;

  const current = NAV.find((n) => location.pathname.startsWith(n.to));
  const pageTitle = current?.label || 'Dashboard';

  return (
    <ToastProvider>
    <ConfirmProvider>
    <div className="admin-scope min-h-screen bg-zinc-950 font-geist text-zinc-200 antialiased">
      {/* Ambient accent glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[420px] w-[620px] rounded-full bg-sky-500/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-[380px] w-[520px] rounded-full bg-emerald-500/8 blur-[120px]" />
      </div>

      <div className="relative flex">
        {/* Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-white/10 bg-zinc-950/70 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-6 py-5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 text-zinc-950 shadow-[0_6px_24px_-6px_rgba(14,165,233,0.7)]">
              <Icon name="solar:bolt-bold" className="text-lg" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white">Staffing Co.</div>
              <div className="text-[11px] text-zinc-500">Staffing OS</div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-2">
            {NAV.filter((item) => !item.ownerOnly || isOwner).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white/10 text-white ring-1 ring-white/10'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                  }`
                }
              >
                <Icon name={item.icon} className="text-lg" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main column */}
        <div className="ml-64 flex min-h-screen w-full flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-zinc-950/60 px-8 py-4 backdrop-blur-xl">
            <div>
              <h1 className="text-xl font-semibold text-white">{pageTitle}</h1>
              <p className="text-xs text-zinc-500">Staffing Co. · Your City, ST</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-zinc-500 transition hover:bg-white/[0.07] hover:text-zinc-300 md:flex"
              >
                <Icon name="solar:magnifer-linear" className="text-base" />
                <span className="w-32 text-left">Search…</span>
                <kbd className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] ring-1 ring-white/10">⌘K</kbd>
              </button>
              <UserMenu />
            </div>
          </header>

          <main className="flex-1 px-8 py-8">
            <Outlet />
          </main>
        </div>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
    </ConfirmProvider>
    </ToastProvider>
  );
}
