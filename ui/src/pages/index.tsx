import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Spinner, Text } from '@chakra-ui/react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard
    router.replace('/dashboard');
  }, [router]);

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bgGradient="linear(135deg, purple.600, blue.500)"
    >
      <Box textAlign="center" color="white">
        <Spinner size="xl" thickness="4px" speed="0.65s" color="white" mb={4} />
        <Text fontSize="lg" fontWeight="medium">
          Loading OpsGraph...
        </Text>
      </Box>
    </Box>
  );
}
