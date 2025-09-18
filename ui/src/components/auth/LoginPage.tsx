import { FC, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Container,
  Divider,
  FormControl,
  FormLabel,
  Input,
  VStack,
  HStack,
  Text,
  Alert,
  AlertIcon,
  Heading,
  useColorModeValue,
  Flex,
  Icon,
  InputGroup,
  InputRightElement,
  IconButton,
} from '@chakra-ui/react';
import {
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { opsGraphAuth, LoginMethod } from '@/lib/auth';
import { useRouter } from 'next/router';

interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: FC<LoginPageProps> = ({ onSuccess }) => {
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('local');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fpOpen, setFpOpen] = useState(false);
  const [fpEmail, setFpEmail] = useState('');
  const [fpSubmitting, setFpSubmitting] = useState(false);
  
  const router = useRouter();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const handleLocalLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { user, error } = await opsGraphAuth.signInWithLocal(email, password);
      
      if (error) {
        setError(error.message);
      } else if (user) {
        onSuccess?.();
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await opsGraphAuth.signInWithMicrosoft();
      
      if (error) {
        setError(error.message);
      }
      // If no error, user will be redirected to Microsoft
    } catch (err) {
      setError('Microsoft login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginMethod === 'local') {
      handleLocalLogin();
    } else {
      handleMicrosoftLogin();
    }
  };

  const handleForgotPassword = async () => {
    setFpSubmitting(true);
    try {
      const { error } = await opsGraphAuth.resetPassword(fpEmail || email);
      if (error) throw error;
      setFpOpen(false);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Password reset failed');
    } finally {
      setFpSubmitting(false);
    }
  };

  return (
    <>
    <Container maxW="md" centerContent py={20}>
      <Card w="full" bg={cardBg} borderColor={borderColor} borderWidth="1px" shadow="xl">
        <CardHeader textAlign="center" pb={6}>
          <VStack spacing={4}>
            <Box p={4} borderRadius="full" bg="brand.100" _dark={{ bg: 'brand.900' }}>
              <UserIcon className="w-8 h-8 text-brand-500" />
            </Box>
            <VStack spacing={1}>
              <Heading size="lg" color="brand.500">OpsGraph Login</Heading>
              <Text color="gray.500" fontSize="sm">
                Access your operations dashboard
              </Text>
            </VStack>
          </VStack>
        </CardHeader>
        <CardBody>
          <VStack spacing={6}>
            {/* Login Method Selection */}
            <HStack spacing={4} w="full">
              <Button
                variant={loginMethod === 'local' ? 'solid' : 'outline'}
                colorScheme="brand"
                flex={1}
                onClick={() => setLoginMethod('local')}
              >
                Local Account
              </Button>
              <Button
                variant={loginMethod === 'microsoft' ? 'solid' : 'outline'}
                colorScheme="blue"
                flex={1}
                onClick={() => setLoginMethod('microsoft')}
              >
                Microsoft Login
              </Button>
            </HStack>

            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {error}
              </Alert>
            )}

            <Box as="form" onSubmit={handleSubmit} w="full">
              <VStack spacing={4}>
                {loginMethod === 'local' ? (
                  <>
                    {/* Local Account Form */}
                    <FormControl isRequired>
                      <FormLabel>Email</FormLabel>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        disabled={isLoading}
                      />
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel>Password</FormLabel>
                      <InputGroup>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          disabled={isLoading}
                        />
                        <InputRightElement>
                          <IconButton
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            icon={showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowPassword(!showPassword)}
                          />
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>

                    <Button
                      type="submit"
                      colorScheme="brand"
                      size="lg"
                      w="full"
                      isLoading={isLoading}
                      loadingText="Signing in..."
                    >
                      Sign In
                    </Button>

                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setFpOpen(true)}
                    >
                      Forgot your password?
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Microsoft Login */}
                    <VStack spacing={4} w="full">
                      <Text textAlign="center" color="gray.600">
                        Sign in with your Microsoft work account
                      </Text>
                      
                      <Button
                        type="submit"
                        colorScheme="blue"
                        size="lg"
                        w="full"
                        isLoading={isLoading}
                        loadingText="Redirecting..."
                        leftIcon={
                          <Box as="svg" w={5} h={5} viewBox="0 0 21 21">
                            <path fill="#f25022" d="M0 0h10v10H0z"/>
                            <path fill="#00a4ef" d="M11 0h10v10H11z"/>
                            <path fill="#7fba00" d="M0 11h10v10H0z"/>
                            <path fill="#ffb900" d="M11 11h10v10H11z"/>
                          </Box>
                        }
                      >
                        Sign in with Microsoft
                      </Button>
                    </VStack>
                  </>
                )}
              </VStack>
            </Box>

            <Divider />
            
            <Text fontSize="xs" color="gray.500" textAlign="center">
              OpsGraph Operations Management System
              <br />
              Site access is controlled by your assigned permissions
            </Text>
          </VStack>
        </CardBody>
      </Card>
    </Container>
    {/* Forgot Password Modal */}
    {fpOpen && (
      <Box position="fixed" inset={0} bg="blackAlpha.600" display="flex" alignItems="center" justifyContent="center" zIndex={1400}>
        <Card w="md">
          <CardHeader>
            <Heading size="md">Reset your password</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color="gray.600">
                Enter your account email and we will send you reset instructions.
              </Text>
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input type="email" value={fpEmail || email} onChange={(e) => setFpEmail(e.target.value)} placeholder="you@example.com" />
              </FormControl>
              <HStack justify="flex-end">
                <Button variant="ghost" onClick={() => setFpOpen(false)}>Cancel</Button>
                <Button colorScheme="brand" onClick={handleForgotPassword} isLoading={fpSubmitting}>Send Reset Link</Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      </Box>
    )}
    </>
  );
};
