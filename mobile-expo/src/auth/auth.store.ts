import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export interface User {
  user_id: number;
  name: string;
  email: string;
  roles: string[];
  site_id?: number;
  team_id?: number;
}

export interface AuthState {
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;

  // Biometric state
  biometricEnabled: boolean;
  biometricSupported: boolean;

  // Device state
  deviceId: string | null;

  // Actions
  login: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  setLoading: (loading: boolean) => void;
  updateUser: (user: User) => void;

  // Biometric actions
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;

  // Initialization
  initialize: () => Promise<void>;
}

const AUTH_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_DATA: 'userData',
  BIOMETRIC_ENABLED: 'biometricEnabled',
  DEVICE_ID: 'deviceId',
} as const;

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  isLoading: true,
  user: null,
  accessToken: null,
  refreshToken: null,
  biometricEnabled: false,
  biometricSupported: false,
  deviceId: null,

  // Authentication actions
  login: async (user: User, accessToken: string, refreshToken: string) => {
    try {
      // Store tokens securely
      await SecureStore.setItemAsync(AUTH_KEYS.ACCESS_TOKEN, accessToken);
      await SecureStore.setItemAsync(AUTH_KEYS.REFRESH_TOKEN, refreshToken);
      await SecureStore.setItemAsync(AUTH_KEYS.USER_DATA, JSON.stringify(user));

      set({
        isAuthenticated: true,
        user,
        accessToken,
        refreshToken,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to store auth data:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      // Clear all stored data
      await Promise.all([
        SecureStore.deleteItemAsync(AUTH_KEYS.ACCESS_TOKEN),
        SecureStore.deleteItemAsync(AUTH_KEYS.REFRESH_TOKEN),
        SecureStore.deleteItemAsync(AUTH_KEYS.USER_DATA),
      ]);

      set({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to clear auth data:', error);
      // Still clear state even if storage fails
      set({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        isLoading: false,
      });
    }
  },

  refreshAccessToken: async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(AUTH_KEYS.REFRESH_TOKEN);
      if (!refreshToken) return null;

      const response = await fetch('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) throw new Error('Token refresh failed');

      const data = await response.json();
      await SecureStore.setItemAsync(AUTH_KEYS.ACCESS_TOKEN, data.accessToken);
      await SecureStore.setItemAsync(AUTH_KEYS.REFRESH_TOKEN, data.refreshToken);

      set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });

      return data.accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If refresh fails, logout user
      await get().logout();
      return null;
    }
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  updateUser: (user: User) => {
    SecureStore.setItemAsync(AUTH_KEYS.USER_DATA, JSON.stringify(user));
    set({ user });
  },

  // Biometric actions
  enableBiometric: async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric authentication',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });

      if (result.success) {
        await SecureStore.setItemAsync(AUTH_KEYS.BIOMETRIC_ENABLED, 'true');
        set({ biometricEnabled: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to enable biometric:', error);
      return false;
    }
  },

  disableBiometric: async () => {
    try {
      await SecureStore.setItemAsync(AUTH_KEYS.BIOMETRIC_ENABLED, 'false');
      set({ biometricEnabled: false });
    } catch (error) {
      console.error('Failed to disable biometric:', error);
    }
  },

  authenticateWithBiometric: async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to continue',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  },

  // Initialization
  initialize: async () => {
    try {
      set({ isLoading: true });

      // Check biometric support
      const biometricSupported = await LocalAuthentication.hasHardwareAsync() &&
                                 await LocalAuthentication.isEnrolledAsync();
      set({ biometricSupported });

      // Load stored data
      const [accessToken, refreshToken, userData, biometricEnabled, deviceId] = await Promise.all([
        SecureStore.getItemAsync(AUTH_KEYS.ACCESS_TOKEN),
        SecureStore.getItemAsync(AUTH_KEYS.REFRESH_TOKEN),
        SecureStore.getItemAsync(AUTH_KEYS.USER_DATA),
        SecureStore.getItemAsync(AUTH_KEYS.BIOMETRIC_ENABLED),
        SecureStore.getItemAsync(AUTH_KEYS.DEVICE_ID),
      ]);

      if (accessToken && refreshToken && userData) {
        const user = JSON.parse(userData);
        set({
          isAuthenticated: true,
          user,
          accessToken,
          refreshToken,
          biometricEnabled: biometricEnabled === 'true',
          deviceId: deviceId || null,
        });
      } else {
        set({
          isAuthenticated: false,
          user: null,
          accessToken: null,
          refreshToken: null,
          biometricEnabled: biometricEnabled === 'true',
          deviceId: deviceId || null,
        });
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));

// Utility functions
export const getAccessToken = async (): Promise<string | null> => {
  const state = useAuthStore.getState();
  if (state.accessToken) return state.accessToken;

  try {
    const token = await SecureStore.getItemAsync(AUTH_KEYS.ACCESS_TOKEN);
    if (token) {
      // Update store with loaded token
      useAuthStore.setState({ accessToken: token });
      return token;
    }
  } catch (error) {
    console.error('Failed to get access token:', error);
  }
  return null;
};

// For axios request interceptor: ensure token is valid or attempt refresh

export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch {
    return true;
  }
};

// Auto token refresh utility
export const ensureValidToken = async (): Promise<string | null> => {
  const state = useAuthStore.getState();
  if (!state.accessToken) return null;

  if (isTokenExpired(state.accessToken)) {
    return await state.refreshAccessToken();
  }

  return state.accessToken;
};
