import * as SecureStore from 'expo-secure-store';

export async function saveKey(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.ALWAYS_THIS_DEVICE_ONLY });
}

export async function getKey(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function deleteKey(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
