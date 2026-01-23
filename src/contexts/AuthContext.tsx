import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, User, AppRole } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<{ error?: string; mustChangePassword?: boolean }>;
  register: (email: string, password: string) => Promise<{ error?: string }>;
  changePassword: (newPassword: string) => Promise<{ error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    const storedMustChange = localStorage.getItem('must_change_password');
    
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setMustChangePassword(storedMustChange === 'true');
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('must_change_password');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await api.login(email, password);
    
    if (error) {
      return { error };
    }
    
    if (data) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      
      if (data.mustChangePassword) {
        localStorage.setItem('must_change_password', 'true');
        setMustChangePassword(true);
      } else {
        localStorage.removeItem('must_change_password');
        setMustChangePassword(false);
      }
      
      setUser(data.user);
      return { mustChangePassword: data.mustChangePassword };
    }
    
    return {};
  };

  const register = async (email: string, password: string) => {
    const { data, error } = await api.register(email, password);
    
    if (error) {
      return { error };
    }
    
    if (data) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      setUser(data.user);
    }
    
    return {};
  };

  const changePassword = async (newPassword: string) => {
    const { error } = await api.changePassword(newPassword);
    
    if (error) {
      return { error };
    }
    
    localStorage.removeItem('must_change_password');
    setMustChangePassword(false);
    return {};
  };

  const logout = () => {
    api.logout();
    localStorage.removeItem('auth_user');
    localStorage.removeItem('must_change_password');
    setUser(null);
    setMustChangePassword(false);
  };

  const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('superadmin') || false;
  const isSuperAdmin = user?.roles?.includes('superadmin') || false;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        mustChangePassword,
        isAdmin,
        isSuperAdmin,
        login,
        register,
        changePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
