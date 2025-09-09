import type { AppProps } from 'next/app';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

import { theme } from '@/theme';
import { ClientOnly } from '@/components/ClientOnly';
import '@/styles/globals.css';

const queryClient = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <JotaiProvider>
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <ClientOnly>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
              <a href="#main-content" className="skip-link">Skip to content</a>
              <div id="__app-root">
                <Component {...pageProps} />
              </div>
              <Toaster richColors position="top-right" />
            </ThemeProvider>
          </ClientOnly>
        </ChakraProvider>
      </QueryClientProvider>
    </JotaiProvider>
  );
}

export default MyApp;
