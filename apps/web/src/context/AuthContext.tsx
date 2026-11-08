import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: 'SYSTEM_ADMIN' | 'USER';
  isEmailVerified: boolean;
  githubConnected: boolean;
  organization?: {
    id: string;
    name: string;
    slug: string;
    role: string;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (loginInput: string, passwordInput: string) => Promise<void>;
  register: (payload: { email: string; username: string; displayName: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const data = await apiRequest<User>('/auth/me');
      if (data && data.id) {
        setUser(data);
        localStorage.setItem('devflow_user', JSON.stringify(data));
      } else {
        setUser(null);
        localStorage.removeItem('devflow_user');
      }
    } catch {
      // A cached profile is not proof of an authenticated server session.
      setUser(null);
      localStorage.removeItem('devflow_user');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (loginInput: string, passwordInput: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ login: loginInput, password: passwordInput }),
      });
      setUser(res.user);
      localStorage.setItem('devflow_user', JSON.stringify(res.user));
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: { email: string; username: string; displayName: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setUser(res.user);
      localStorage.setItem('devflow_user', JSON.stringify(res.user));
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Silently proceed
    } finally {
      setUser(null);
      localStorage.removeItem('devflow_user');
    }
  };

  const updateUser = (updated: Partial<User>) => {
    if (!user) return;
    const merged = { ...user, ...updated };
    setUser(merged);
    localStorage.setItem('devflow_user', JSON.stringify(merged));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
