import { FC, useState, useEffect } from 'react';
import { Box, Text, VStack, HStack, Badge, Button, Collapse } from '@chakra-ui/react';
import { useAuth } from '../auth/AuthProvider';

interface DebugInfo {
  authState: string;
  hasToken: boolean;
  hasRefreshToken: boolean;
  lastApiError: string | null;
  apiBaseUrl: string;
  userAgent: string;
  timestamp: string;
}

export const DebugOverlay: FC = () => {
  const { user, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  useEffect(() => {
    const updateDebugInfo = () => {
      if (typeof window === 'undefined') return;
      
      const token = localStorage.getItem('opsgraph_token');
      const refreshToken = localStorage.getItem('opsgraph_refresh_token');
      const lastError = localStorage.getItem('debug_last_api_error');
      
      setDebugInfo({
        authState: isLoading ? 'loading' : user ? 'authenticated' : 'unauthenticated',
        hasToken: !!token,
        hasRefreshToken: !!refreshToken,
        lastApiError: lastError,
        apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
        userAgent: navigator.userAgent.slice(0, 50) + '...',
        timestamp: new Date().toLocaleTimeString()
      });
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 2000);
    return () => clearInterval(interval);
  }, [user, isLoading]);

  const clearDebugData = () => {
    localStorage.removeItem('debug_last_api_error');
    localStorage.removeItem('opsgraph_token');
    localStorage.removeItem('opsgraph_refresh_token');
    window.location.reload();
  };

  if (!debugInfo) return null;

  return (
    <Box
      position="fixed"
      top={4}
      right={4}
      zIndex={9999}
      bg="red.500"
      color="white"
      p={2}
      borderRadius="md"
      fontSize="xs"
      fontFamily="mono"
      shadow="lg"
    >
      <HStack spacing={2}>
        <Text fontWeight="bold">DEBUG</Text>
        <Button size="xs" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? 'Hide' : 'Show'}
        </Button>
      </HStack>
      
      <Collapse in={isOpen}>
        <VStack align="start" spacing={1} mt={2} minW="300px">
          <HStack>
            <Text>Auth:</Text>
            <Badge colorScheme={debugInfo.authState === 'authenticated' ? 'green' : 'red'}>
              {debugInfo.authState}
            </Badge>
          </HStack>
          
          <HStack>
            <Text>Token:</Text>
            <Badge colorScheme={debugInfo.hasToken ? 'green' : 'red'}>
              {debugInfo.hasToken ? 'YES' : 'NO'}
            </Badge>
          </HStack>
          
          <HStack>
            <Text>Refresh:</Text>
            <Badge colorScheme={debugInfo.hasRefreshToken ? 'green' : 'red'}>
              {debugInfo.hasRefreshToken ? 'YES' : 'NO'}
            </Badge>
          </HStack>
          
          {debugInfo.lastApiError && (
            <Box>
              <Text color="yellow.200">Last API Error:</Text>
              <Text fontSize="2xs" maxW="280px" wordBreak="break-word">
                {debugInfo.lastApiError}
              </Text>
            </Box>
          )}
          
          <Text>API Base: {debugInfo.apiBaseUrl}</Text>
          <Text>Updated: {debugInfo.timestamp}</Text>
          
          <Button size="xs" colorScheme="yellow" onClick={clearDebugData} mt={2}>
            Clear & Reload
          </Button>
        </VStack>
      </Collapse>
    </Box>
  );
};