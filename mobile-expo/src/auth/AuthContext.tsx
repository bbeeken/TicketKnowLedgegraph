import React, { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from './auth.store';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  biometricEnabled: boolean;
  biometricSupported: boolean;
  login: (user: any, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const authStore = useAuthStore();

  useEffect(() => {
    // Initialize auth state on app start
    authStore.initialize();
  }, []);

  const value: AuthContextType = {
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading,
    user: authStore.user,
    biometricEnabled: authStore.biometricEnabled,
    biometricSupported: authStore.biometricSupported,
    login: authStore.login,
    logout: authStore.logout,
    refreshAccessToken: authStore.refreshAccessToken,
    enableBiometric: authStore.enableBiometric,
    disableBiometric: authStore.disableBiometric,
    authenticateWithBiometric: authStore.authenticateWithBiometric,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
