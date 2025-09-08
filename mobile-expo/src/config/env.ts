import Constants from 'expo-constants';

export const API_BASE_URL = (Constants.expoConfig?.extra as any)?.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';
export const SSE_ENABLED = ((Constants.expoConfig?.extra as any)?.sseEnabled || process.env.EXPO_PUBLIC_SSE_ENABLED || 'true') === 'true';
