import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('tf_admin_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!token;

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('tf_admin_token');
  }, []);

  // Re-validates the token and loads the current user's name/role on every
  // mount (page refresh) instead of just decoding the JWT client-side — this
  // also catches a deactivated/deleted account immediately, not just expiry.
  useEffect(() => {
    if (!token) { setUser(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fetch('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => { if (!res.ok) throw new Error('Session expired'); return res.json(); })
      .then((data) => { if (!cancelled) setUser(data.user); })
      .catch(() => { if (!cancelled) logout(); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, logout]);

  const login = async (email, password) => {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Invalid email or password');
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('tf_admin_token', data.token);
    return data.token;
  };

  const role = user?.role;

  return (
    <AuthContext.Provider
      value={{
        token, user, isAuthenticated, loading, login, logout,
        isOwner: role === 'owner', isRecruiter: role === 'recruiter', isViewer: role === 'viewer',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
