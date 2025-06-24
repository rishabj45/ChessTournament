// frontend/src/hooks/useAuth.ts
import { useState } from 'react';
import { apiService } from '@/services/api';

export function useAuth() {
  const [user, setUser] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState(false);

  const login = async ({ username, password }: { username: string; password: string }) => {
    try {
      const response = await apiService.login({ username, password }); // calls /api/auth/login
      localStorage.setItem('token', response.token);
      setUser(username); // or response.user if backend returns it
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  };
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setAdminMode(false); // optional: reset admin mode on logout
  };

  return {
    isAuthenticated: !!user,
    adminMode,
    toggleAdminMode: () => setAdminMode((prev) => !prev),
    login,
    logout,
  };
}
