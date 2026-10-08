import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../types';
import { logoutApi, getMe } from './api';

interface AuthContextType {
  user: User | null;
  login: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  const isTokenExpired = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp;
      if (!expiry) return true;
      const now = Math.floor(Date.now() / 1000);
      return now >= expiry;
    } catch (error) {
      console.error('Error decoding token:', error);
      return true;
    }
  };

  const [user, setUser] = useState<User | null>(() => {
    const token = localStorage.getItem('token');
    const cachedUser = localStorage.getItem('user');
    if (token && cachedUser) {
      try {
        return JSON.parse(cachedUser);
      } catch (error) {
        console.error('Invalid user data in localStorage:', error);
        return null;
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refresh_token');

      if (token || refreshToken) {
        try {
          const freshUser = await getMe();
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        } catch (error) {
          console.error('Error fetching claim context via /me:', error);
          if (token && isTokenExpired(token) && !refreshToken) {
            logout();
            navigate('/login');
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [navigate]);

  const login = (user: User, token: string, refreshToken: string) => {
    if (!user || !token) {
      console.error('Invalid login attempt: user or token is missing');
      return;
    }
    localStorage.setItem('token', token);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  const logout = () => {
    console.log('Logging out');
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      logoutApi(refreshToken).catch((err) => console.error(err));
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};