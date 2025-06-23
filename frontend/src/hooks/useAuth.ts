import { useState, useEffect } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiService } from '../services/api';
import { LoginRequest, AuthResponse, UseAuthReturn } from '../types';
import toast from 'react-hot-toast';
import axios from 'axios';

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const queryClient = useQueryClient();

  // Helper to clear session
  const clearSession = (message?: string) => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    if (message) toast.error(message);
    window.location.reload();
  };

  // Attach interceptors only once
  useEffect(() => {
    const reqInterceptor = axios.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    const resInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          clearSession('Session expired. Please log in again.');
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(reqInterceptor);
      axios.interceptors.response.eject(resInterceptor);
    };
  }, []);

  // Load user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch {
        clearSession();
      }
    }
  }, []);

  // 🛡️ Verify token on load — auto-logout if invalid
  const {
    data: verifyData,
    error: verifyError,
    isLoading: verifyLoading,
  } = useQuery<{ valid: boolean }, Error>({
    queryKey: ['auth', 'verify'],
    queryFn: () => apiService.verifyToken(),
    enabled: !!localStorage.getItem('access_token'),
    retry: false,
  });

  useEffect(() => {
    if (verifyData && !verifyData.valid) {
      clearSession('Session expired. Please log in again.');
    }
    if (verifyError) {
      clearSession('Session invalid or expired.');
    }
  }, [verifyData, verifyError]);

  // 🔐 Login mutation
  const { mutate: loginMutate, isPending: loginLoading } = useMutation<
    AuthResponse,
    Error,
    LoginRequest
  >({
    mutationFn: (creds) => apiService.login(creds),
    onSuccess: (data) => {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setIsAuthenticated(true);
      toast.success('Successfully logged in!');
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Login failed');
    },
  });

  // 🔓 Logout mutation
  const { mutate: logoutMutate, isPending: logoutLoading } = useMutation<
    void,
    Error
  >({
    mutationFn: () => apiService.logout(),
    onSuccess: () => {
      clearSession('Successfully logged out!');
      queryClient.clear();
    },
    onError: (err: any) => {
      console.error(err);
      clearSession('Logout failed, but you have been logged out locally');
    },
  });

  // Handlers
  const login = (creds: LoginRequest) =>
    new Promise<void>((res, rej) =>
      loginMutate(creds, { onSuccess: () => res(), onError: (e) => rej(e) })
    );
  const logout = () => logoutMutate();
  const toggleAdminMode = () => setAdminMode((m) => !m);

  return {
    user,
    isAuthenticated,
    isLoading: verifyLoading || loginLoading || logoutLoading,
    adminMode,
    toggleAdminMode,
    login,
    logout,
  };
};