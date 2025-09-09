import { FC, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Center,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useAuth } from '@/components/auth/AuthProvider';

const LogoutPage: FC = () => {
  const router = useRouter();
  const { signOut } = useAuth();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await signOut();
        // Redirect to login page after signout
        router.replace('/login');
      } catch (error) {
        console.error('Logout error:', error);
        // Even if logout fails, redirect to login
        router.replace('/login');
      }
    };

    handleLogout();
  }, [signOut, router]);

  return (
    <Center h="100vh" bg="gray.50">
      <VStack spacing={4}>
        <Spinner size="lg" color="brand.500" thickness="4px" />
        <Text color="gray.600">Signing you out...</Text>
      </VStack>
    </Center>
  );
};

export default LogoutPage;
