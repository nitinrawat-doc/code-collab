import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { connectSocket, disconnectSocket } from '../socket/socketClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, verify session via /api/auth/me
  useEffect(() => {
    const verify = async () => {
      try {
        const { data } = await authService.getMe();
        setUser(data.user);
        if (data.token) {
          localStorage.setItem('token', data.token);
          connectSocket(data.token);
        }
      } catch {
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await authService.login(credentials);
    setUser(data.user);
    if (data.token) {
      localStorage.setItem('token', data.token);
      connectSocket(data.token);
    }
    return data.user;
  }, []);

  const register = useCallback(async (credentials) => {
    const { data } = await authService.register(credentials);
    setUser(data.user);
    if (data.token) {
      localStorage.setItem('token', data.token);
      connectSocket(data.token);
    }
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem('token');
    try { await authService.logout(); } catch { /* ignore */ }
    setUser(null);
    disconnectSocket();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
