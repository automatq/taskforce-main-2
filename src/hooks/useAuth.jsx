import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('tf_admin_token'));

  const isAuthenticated = !!token;

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
          setToken(null);
          localStorage.removeItem('tf_admin_token');
        }
      } catch {
        setToken(null);
        localStorage.removeItem('tf_admin_token');
      }
    }
  }, [token]);

  const login = async (password) => {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (!res.ok) throw new Error('Invalid password');
    const data = await res.json();
    setToken(data.token);
    localStorage.setItem('tf_admin_token', data.token);
    return data.token;
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('tf_admin_token');
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
