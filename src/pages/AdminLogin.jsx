import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Icon, Spinner } from '../components/admin/ui';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/admin/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-scope relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 font-geist text-zinc-200 antialiased">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/3 h-[420px] w-[620px] rounded-full bg-sky-500/15 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[380px] w-[520px] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md px-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl shadow-[0_24px_80px_-20px_rgba(0,0,0,0.8)]">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 text-zinc-950 shadow-[0_8px_30px_-8px_rgba(14,165,233,0.7)]">
              <Icon name="solar:bolt-bold" className="text-2xl" />
            </div>
            <h1 className="text-2xl font-semibold text-white">Staffing Co.</h1>
            <p className="mt-1 text-sm text-zinc-500">Sign in to your operations console</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder:text-zinc-600 outline-none transition focus:border-sky-400/50 focus:bg-white/[0.06]"
                placeholder="you@company.com"
                autoFocus
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder:text-zinc-600 outline-none transition focus:border-sky-400/50 focus:bg-white/[0.06]"
                placeholder="Enter your password"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-rose-500/10 px-4 py-2 text-sm text-rose-300 ring-1 ring-rose-400/20">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-3.5 font-medium text-white transition-all hover:bg-sky-400 active:scale-[0.99] disabled:opacity-50 shadow-[0_8px_30px_-8px_rgba(14,165,233,0.7)]"
            >
              {loading ? <Spinner className="h-5 w-5" /> : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] text-zinc-600">
            Cutting-edge ATS + CRM for staffing agencies
          </p>
        </div>
      </div>
    </div>
  );
}
