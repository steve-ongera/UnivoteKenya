import { createContext, useContext, useState, useEffect } from 'react';
import { getToken, getUser, setToken, setUser, removeToken, removeUser, authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(getUser());
  const [token, setTokenState] = useState(getToken());
  const [loading, setLoading] = useState(false);

  const login = async (credentials) => {
    const data = await authAPI.login(credentials);
    setToken(data.token);
    setUser(data.user);
    setTokenState(data.token);
    setUserState(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await authAPI.logout(); } catch (_) {}
    removeToken(); removeUser();
    setTokenState(null); setUserState(null);
  };

  const refreshUser = async () => {
    try {
      const data = await authAPI.me();
      setUser(data); setUserState(data);
    } catch (_) {}
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser, isAuth: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);