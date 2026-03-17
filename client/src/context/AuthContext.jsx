import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API = '/api';

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ loading: true, authenticated: false, authEnabled: false });

  useEffect(() => {
    fetch(`${API}/auth/verify`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setAuth({ loading: false, authenticated: data.authenticated, authEnabled: data.authEnabled }))
      .catch(() => setAuth({ loading: false, authenticated: false, authEnabled: true }));
  }, []);

  const login = async (pin) => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
    setAuth({ loading: false, authenticated: true, authEnabled: true });
  };

  const logout = async () => {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
    setAuth({ loading: false, authenticated: false, authEnabled: auth.authEnabled });
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
