import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(password);
      navigate('/admin/dashboard');
    } catch {
      setError('Invalid password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-24 lg:py-32 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto px-6">
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[#F5F4F2] border border-stone-200 flex items-center justify-center mx-auto mb-4">
              <iconify-icon icon="solar:lock-keyhole-linear" className="text-2xl text-[#827A71]"></iconify-icon>
            </div>
            <h1 className="text-2xl font-playfair text-[#2C2B29]">Admin Login</h1>
            <p className="text-stone-500 font-montserrat font-light text-base mt-1">Task Force Dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5 font-montserrat">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl border border-stone-200 px-4 py-3 text-base text-stone-900 font-light focus:outline-none focus:ring-2 focus:ring-[#827A71]/30 focus:border-[#827A71] transition-colors"
                placeholder="Enter admin password"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm font-montserrat bg-red-50 rounded-lg px-4 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#817872] text-white rounded-xl py-3.5 font-normal hover:bg-stone-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
