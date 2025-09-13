import { FC, useState, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  Kbd,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  VStack,
  Text,
  useDisclosure,
  useColorModeValue,
  Spinner,
  Divider,
  Flex,
  Badge,
} from '@chakra-ui/react';
import {
  MagnifyingGlassIcon,
  CommandLineIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'ticket' | 'alert' | 'asset' | 'user';
  url: string;
  priority?: number;
}

export const GlobalSearch: FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const router = useRouter();
  
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Global search hotkey (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpen();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpen, onClose]);

  // Handle arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        const result = results[selectedIndex];
        router.push(result.url);
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, results, router, onClose]);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, search]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ticket': return 'blue';
      case 'alert': return 'red';
      case 'asset': return 'green';
      case 'user': return 'purple';
      default: return 'gray';
    }
  };

  return (
    <>
      <InputGroup maxW="md">
        <InputLeftElement>
          <MagnifyingGlassIcon width={20} />
        </InputLeftElement>
        <Input
          placeholder="Search..."
          onClick={onOpen}
          readOnly
          cursor="pointer"
          bg={bg}
          borderColor={borderColor}
          _hover={{ borderColor: 'brand.400' }}
        />
        <InputRightElement>
          <HStack spacing={1}>
            <Kbd fontSize="sm">⌘</Kbd>
            <Kbd fontSize="sm">K</Kbd>
          </HStack>
        </InputRightElement>
      </InputGroup>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent maxW="600px" mx={4}>
          <ModalBody p={0}>
            <VStack spacing={0} align="stretch">
              <HStack p={4} borderBottomWidth="1px" borderColor={borderColor}>
                <MagnifyingGlassIcon width={20} />
                <Input
                  placeholder="Search tickets, alerts, assets..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  variant="unstyled"
                  fontSize="lg"
                  autoFocus
                />
                {isLoading && <Spinner size="sm" />}
              </HStack>

              {results.length > 0 && (
                <Box maxH="400px" overflowY="auto">
                  {results.map((result, index) => (
                    <Box
                      key={result.id}
                      p={3}
                      cursor="pointer"
                      bg={selectedIndex === index ? 'brand.50' : 'transparent'}
                      _hover={{ bg: 'brand.50' }}
                      borderBottomWidth="1px"
                      borderColor={borderColor}
                      onClick={() => {
                        router.push(result.url);
                        onClose();
                      }}
                    >
                      <Flex justify="space-between" align="start">
                        <VStack align="start" spacing={1} flex={1}>
                          <HStack>
                            <Badge colorScheme={getTypeColor(result.type)} size="sm">
                              {result.type}
                            </Badge>
                            <Text fontWeight="medium" fontSize="sm">
                              {result.title}
                            </Text>
                          </HStack>
                          <Text fontSize="xs" color="gray.500" noOfLines={2}>
                            {result.description}
                          </Text>
                        </VStack>
                        {result.priority && (
                          <Badge
                            colorScheme={result.priority >= 4 ? 'red' : result.priority >= 3 ? 'orange' : 'green'}
                            size="sm"
                          >
                            P{result.priority}
                          </Badge>
                        )}
                      </Flex>
                    </Box>
                  ))}
                </Box>
              )}

              {query && results.length === 0 && !isLoading && (
                <Box p={8} textAlign="center">
                  <Text color="gray.500">No results found for &ldquo;{query}&rdquo;</Text>
                </Box>
              )}

              <Box p={3} borderTopWidth="1px" borderColor={borderColor}>
                <HStack spacing={4} fontSize="xs" color="gray.500">
                  <HStack>
                    <Kbd>↑↓</Kbd>
                    <Text>Navigate</Text>
                  </HStack>
                  <HStack>
                    <Kbd>↵</Kbd>
                    <Text>Select</Text>
                  </HStack>
                  <HStack>
                    <Kbd>Esc</Kbd>
                    <Text>Close</Text>
                  </HStack>
                </HStack>
              </Box>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};
