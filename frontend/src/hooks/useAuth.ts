import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiService } from '../services/api';
import { LoginRequest, AuthResponse, UseAuthReturn } from '../types';
import toast from 'react-hot-toast';

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const queryClient = useQueryClient();

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');
    
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
      }
    }
  }, []);

  // Verify token on app load
  const { isLoading } = useQuery(
    ['auth', 'verify'],
    () => apiService.verifyToken(),
    {
      enabled: !!localStorage.getItem('access_token'),
      retry: false,
      onError: () => {
        // Token is invalid, clear storage
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
      },
    }
  );

  // Login mutation
  const loginMutation = useMutation(
    (credentials: LoginRequest) => apiService.login(credentials),
    {
      onSuccess: (data: AuthResponse) => {
        // Store token and user info
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        setUser(data.user);
        setIsAuthenticated(true);
        
        toast.success('Successfully logged in!');
        
        // Invalidate all queries to refetch with new auth
        queryClient.invalidateQueries();
      },
      onError: (error: any) => {
        console.error('Login error:', error);
        toast.error(error.response?.data?.detail || 'Login failed');
      },
    }
  );

  // Logout mutation
  const logoutMutation = useMutation(
    () => apiService.logout(),
    {
      onSuccess: () => {
        // Clear storage and state
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
        
        toast.success('Successfully logged out!');
        
        // Clear all cached data
        queryClient.clear();
      },
      onError: (error: any) => {
        console.error('Logout error:', error);
        // Still clear local state even if server request fails
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
        
        toast.error('Logout failed, but you have been logged out locally');
      },
    }
  );

  const login = async (credentials: LoginRequest): Promise<void> => {
    return new Promise((resolve, reject) => {
      loginMutation.mutate(credentials, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error),
      });
    });
  };

  const logout = (): void => {
    logoutMutation.mutate();
  };

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || loginMutation.isLoading || logoutMutation.isLoading,
    login,
    logout,
  };
};