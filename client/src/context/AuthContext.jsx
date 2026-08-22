import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { connectSocket, disconnectSocket } from '../socket/socketClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, verify session via /api/auth/me (uses HttpOnly cookie)
  useEffect(() => {
    const verify = async () => {
      try {
        const { data } = await authService.getMe();
        setUser(data.user);
        // /me now returns a fresh token so socket can reconnect after page refresh
        if (data.token) {
          connectSocket(data.token);
        }
      } catch {
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
    // Use the token returned in the response body for socket auth
    connectSocket(data.token);
    return data.user;
  }, []);

  const register = useCallback(async (credentials) => {
    const { data } = await authService.register(credentials);
    setUser(data.user);
    connectSocket(data.token);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
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
