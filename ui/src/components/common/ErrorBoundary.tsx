import { Component, ReactNode } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  HStack,
  Icon,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Code,
  Collapse,
} from '@chakra-ui/react';
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  HomeIcon,
  ClipboardIcon,
} from '@heroicons/react/24/outline';
import { FC, useState } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

// Error Display Component
interface ErrorDisplayProps {
  error?: Error;
  errorInfo?: any;
  onRetry?: () => void;
  onGoHome?: () => void;
}

const ErrorDisplay: FC<ErrorDisplayProps> = ({ error, errorInfo, onRetry, onGoHome }) => {
  const [showDetails, setShowDetails] = useState(false);
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('red.200', 'red.700');

  const copyErrorToClipboard = () => {
    const errorText = `
Error: ${error?.message || 'Unknown error'}
Stack: ${error?.stack || 'No stack trace'}
Component Stack: ${errorInfo?.componentStack || 'No component stack'}
    `.trim();
    
    navigator.clipboard.writeText(errorText);
  };

  return (
    <Box
      minH="50vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={8}
    >
      <Box
        maxW="lg"
        w="full"
        bg={cardBg}
        borderRadius="xl"
        shadow="xl"
        borderWidth="2px"
        borderColor={borderColor}
        p={8}
      >
        <VStack spacing={6} textAlign="center">
          <Box>
            <Icon
              as={ExclamationTriangleIcon}
              boxSize={16}
              color="red.500"
              mb={4}
            />
            <Heading size="lg" color="red.500" mb={2}>
              Something went wrong
            </Heading>
            <Text color="gray.600" fontSize="lg">
              We&apos;re sorry, but an unexpected error occurred.
            </Text>
          </Box>

          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Error Details</AlertTitle>
              <AlertDescription>
                {error?.message || 'An unknown error occurred'}
              </AlertDescription>
            </Box>
          </Alert>

          <HStack spacing={4} flexWrap="wrap" justify="center">
            {onRetry && (
              <Button
                leftIcon={<ArrowPathIcon width={20} />}
                colorScheme="blue"
                onClick={onRetry}
              >
                Try Again
              </Button>
            )}
            {onGoHome && (
              <Button
                leftIcon={<HomeIcon width={20} />}
                variant="outline"
                onClick={onGoHome}
              >
                Go Home
              </Button>
            )}
            <Button
              leftIcon={<ClipboardIcon width={20} />}
              variant="outline"
              size="sm"
              onClick={copyErrorToClipboard}
            >
              Copy Error
            </Button>
          </HStack>

          {(error || errorInfo) && (
            <Box w="full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide' : 'Show'} Technical Details
              </Button>
              
              <Collapse in={showDetails} animateOpacity>
                <VStack spacing={3} mt={4} align="stretch">
                  {error && (
                    <Box>
                      <Text fontSize="sm" fontWeight="bold" mb={2}>
                        Error Stack:
                      </Text>
                      <Code
                        p={3}
                        borderRadius="md"
                        fontSize="xs"
                        w="full"
                        whiteSpace="pre-wrap"
                        maxH="200px"
                        overflowY="auto"
                      >
                        {error.stack}
                      </Code>
                    </Box>
                  )}
                  
                  {errorInfo?.componentStack && (
                    <Box>
                      <Text fontSize="sm" fontWeight="bold" mb={2}>
                        Component Stack:
                      </Text>
                      <Code
                        p={3}
                        borderRadius="md"
                        fontSize="xs"
                        w="full"
                        whiteSpace="pre-wrap"
                        maxH="200px"
                        overflowY="auto"
                      >
                        {errorInfo.componentStack}
                      </Code>
                    </Box>
                  )}
                </VStack>
              </Collapse>
            </Box>
          )}
        </VStack>
      </Box>
    </Box>
  );
};

// Error Boundary Class Component
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({
      hasError: true,
      error,
      errorInfo,
    });

    // Log error to external service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call optional onError callback
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorDisplay
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return this.props.children;
  }
}

// Simple Error Message Component
interface ErrorMessageProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export const ErrorMessage: FC<ErrorMessageProps> = ({
  title = 'Error',
  message = 'Something went wrong',
  onRetry,
  showRetry = true,
}) => {
  return (
    <Alert status="error" borderRadius="md" p={6}>
      <AlertIcon />
      <Box flex="1">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription display="block" mt={2}>
          {message}
        </AlertDescription>
        {showRetry && onRetry && (
          <Button
            size="sm"
            colorScheme="red"
            variant="outline"
            mt={4}
            leftIcon={<ArrowPathIcon width={16} />}
            onClick={onRetry}
          >
            Try Again
          </Button>
        )}
      </Box>
    </Alert>
  );
};

export default ErrorBoundary;
