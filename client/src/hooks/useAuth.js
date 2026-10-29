import { useState, useCallback } from 'react';
import { api } from '../services/api';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!api.getToken());

  const login = useCallback(async (pin) => {
    const { token } = await api.login(pin);
    api.setToken(token);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    api.clearToken();
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, login, logout };
}
