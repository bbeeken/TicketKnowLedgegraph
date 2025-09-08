import create from 'zustand';
import * as SecureStore from 'expo-secure-store';

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (a: string, r: string) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  setTokens: (a, r) => set({ accessToken: a, refreshToken: r }),
  clear: () => set({ accessToken: null, refreshToken: null }),
}));

export async function getAccessToken() {
  const s = useAuthStore.getState();
  if (s.accessToken) return s.accessToken;
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    useAuthStore.getState().setTokens(token, s.refreshToken || '');
    return token;
  }
  return null;
}

export async function getRefreshToken() {
  const s = useAuthStore.getState();
  if (s.refreshToken) return s.refreshToken;
  const token = await SecureStore.getItemAsync('refreshToken');
  if (token) {
    useAuthStore.getState().setTokens(s.accessToken || '', token);
    return token;
  }
  return null;
}

export async function setTokens(access: string, refresh: string) {
  useAuthStore.getState().setTokens(access, refresh);
  await SecureStore.setItemAsync('accessToken', access);
  await SecureStore.setItemAsync('refreshToken', refresh);
}

export async function clearTokens() {
  useAuthStore.getState().clear();
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
}

export const AuthProvider: React.FC<{ children: React.ReactNode }>= ({ children }) => {
  return <>{children}</>;
};
