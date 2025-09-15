import { AppProps } from 'next/app';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';
import { AppLayout } from '../src/components/layout/AppLayout';
import { Toaster } from 'sonner';

import { theme } from '../src/theme';
import { ClientOnly } from '../src/components/ClientOnly';
import { AuthProvider } from '../src/components/auth/AuthProvider';
import '../src/styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <JotaiProvider>
      <ChakraProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ClientOnly>
              <Component {...pageProps} />
              <Toaster position="top-right" />
            </ClientOnly>
          </AuthProvider>
        </QueryClientProvider>
      </ChakraProvider>
    </JotaiProvider>
  );
}