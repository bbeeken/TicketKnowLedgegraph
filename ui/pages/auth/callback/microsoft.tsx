import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  VStack,
  Spinner,
  Text,
  Alert,
  AlertIcon,
  Button,
} from '@chakra-ui/react';
import { opsGraphAuth } from '../../../src/lib/auth';

const MicrosoftCallbackPage: NextPage = () => {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { code, state, error: authError } = router.query;

        if (authError) {
          setError(`Authentication failed: ${authError}`);
          setIsProcessing(false);
          return;
        }

        if (!code || !state) {
          setError('Missing authentication parameters');
          setIsProcessing(false);
          return;
        }

        // Process the Microsoft callback
        const { user, error } = await opsGraphAuth.handleMicrosoftCallback(
          code as string,
          state as string
        );

        if (error) {
          setError(error.message);
        } else if (user) {
          // Success! Redirect to dashboard
          router.push('/dashboard');
        } else {
          setError('Authentication failed - no user returned');
        }
      } catch (err) {
        setError('An unexpected error occurred during authentication');
      } finally {
        setIsProcessing(false);
      }
    };

    if (router.isReady) {
      handleCallback();
    }
  }, [router.isReady, router.query, router]);

  if (isProcessing) {
    return (
      <Container maxW="md" centerContent py={20}>
        <VStack spacing={6}>
          <Spinner size="xl" color="blue.500" />
          <Text>Processing Microsoft login...</Text>
        </VStack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="md" centerContent py={20}>
        <VStack spacing={6}>
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
          <Button
            colorScheme="blue"
            onClick={() => router.push('/login')}
          >
            Back to Login
          </Button>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="md" centerContent py={20}>
      <VStack spacing={6}>
        <Text>Redirecting...</Text>
      </VStack>
    </Container>
  );
};

export default MicrosoftCallbackPage;