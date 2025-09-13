import type { AppProps } from 'next/app';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';
import { Toaster } from 'sonner';

import { theme } from '@/theme';
import { ClientOnly } from '@/components/ClientOnly';
import { AuthProvider } from '@/components/auth/AuthProvider';
import '@/styles/globals.css';

const queryClient = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <JotaiProvider>
        <QueryClientProvider client={queryClient}>
          <ChakraProvider theme={theme}>
            <ClientOnly>
              <AuthProvider>
                <a href="#main-content" className="skip-link">Skip to content</a>
                <div id="__app-root">
                  <Component {...pageProps} />
                </div>
                <Toaster richColors position="top-right" />
              </AuthProvider>
            </ClientOnly>
          </ChakraProvider>
        </QueryClientProvider>
      </JotaiProvider>
    </>
  );
}export default MyApp;
