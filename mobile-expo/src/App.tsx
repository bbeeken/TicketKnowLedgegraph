import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSQLiteStorage } from './db/persist';
import { Navigation } from './navigation';
import { AuthProvider } from './auth/auth.store';

const queryClient = new QueryClient();

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Navigation />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
