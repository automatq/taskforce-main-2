export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('tf_admin_token');

  const headers = { ...options.headers };
  if (token && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (!res.ok) {
    // Session expired / invalid token → clear and bounce to login.
    if (res.status === 401 && !options.skipAuth) {
      localStorage.removeItem('tf_admin_token');
      if (!window.location.pathname.endsWith('/admin')) {
        window.location.assign('/admin');
      }
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return res.json();
}
