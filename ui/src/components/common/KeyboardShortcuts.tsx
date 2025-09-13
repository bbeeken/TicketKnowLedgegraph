import { FC, useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Kbd,
  Divider,
  Box,
  useColorModeValue,
  Badge,
  Grid,
  GridItem,
} from '@chakra-ui/react';

interface Shortcut {
  key: string;
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Navigation
  { key: 'g h', description: 'Go to Dashboard', category: 'Navigation' },
  { key: 'g t', description: 'Go to Tickets', category: 'Navigation' },
  { key: 'g a', description: 'Go to Assets', category: 'Navigation' },
  { key: 'g k', description: 'Go to Knowledge Base', category: 'Navigation' },
  { key: 'g s', description: 'Go to Settings', category: 'Navigation' },
  
  // Search & Actions
  { key: 'cmd+k', description: 'Global Search', category: 'Search' },
  { key: 'cmd+/', description: 'Show Keyboard Shortcuts', category: 'Help' },
  { key: '/', description: 'Focus Search', category: 'Search' },
  { key: 'esc', description: 'Close Modal/Panel', category: 'General' },
  
  // Tickets
  { key: 'c', description: 'Create New Ticket', category: 'Tickets' },
  { key: 'r', description: 'Refresh Ticket List', category: 'Tickets' },
  { key: 'f', description: 'Filter Tickets', category: 'Tickets' },
  { key: 'e', description: 'Edit Selected Ticket', category: 'Tickets' },
  
  // General
  { key: 'cmd+,', description: 'Open Preferences', category: 'General' },
  { key: 'cmd+shift+d', description: 'Toggle Dark Mode', category: 'General' },
  { key: 'cmd+shift+n', description: 'Show Notifications', category: 'General' },
  { key: '?', description: 'Show Help', category: 'Help' },
];

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcuts: FC<KeyboardShortcutsProps> = ({ isOpen, onClose }) => {
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const categoryBg = useColorModeValue('gray.50', 'gray.700');
  const hoverBg = useColorModeValue('gray.100', 'gray.600');

  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  const formatKey = (key: string) => {
    return key.split(' ').map((k, index) => (
      <span key={index}>
        {index > 0 && <Text as="span" mx={1} fontSize="xs" color="gray.500">then</Text>}
        <Kbd fontSize="sm">{k}</Kbd>
      </span>
    ));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalOverlay />
      <ModalContent bg={bg} borderColor={borderColor}>
        <ModalHeader>
          <HStack>
            <Text>Keyboard Shortcuts</Text>
            <Badge colorScheme="purple" fontSize="xs">
              {shortcuts.length} shortcuts
            </Badge>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody pb={6}>
          <VStack spacing={6} align="stretch">
            {categories.map(category => (
              <Box key={category}>
                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                  color="purple.500"
                  mb={3}
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  {category}
                </Text>
                
                <VStack spacing={2} align="stretch">
                  {shortcuts
                    .filter(s => s.category === category)
                    .map(shortcut => (
                      <HStack
                        key={shortcut.key}
                        justify="space-between"
                        p={3}
                        bg={categoryBg}
                        borderRadius="md"
                        _hover={{ bg: hoverBg }}
                      >
                        <Text fontSize="sm">{shortcut.description}</Text>
                        <HStack spacing={1}>
                          {formatKey(shortcut.key)}
                        </HStack>
                      </HStack>
                    ))}
                </VStack>
              </Box>
            ))}
            
            <Divider />
            
            <Box>
              <Text fontSize="sm" color="gray.500" textAlign="center">
                Press <Kbd fontSize="sm">esc</Kbd> or <Kbd fontSize="sm">cmd+/</Kbd> to close this dialog
              </Text>
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

// Hook to manage global keyboard shortcuts
export const useKeyboardShortcuts = () => {
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          (event.target as Element)?.getAttribute('contenteditable') === 'true') {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? event.metaKey : event.ctrlKey;

      // Global shortcuts
      if (cmdKey && event.key === '/') {
        event.preventDefault();
        setShowShortcuts(prev => !prev);
      }

      // Escape key
      if (event.key === 'Escape') {
        setShowShortcuts(false);
      }

      // Help shortcut
      if (event.key === '?' && !event.shiftKey) {
        event.preventDefault();
        setShowShortcuts(true);
      }

      // Navigation shortcuts (g + key)
      if (event.key === 'g' && !cmdKey) {
        event.preventDefault();
        
        // Set up a timeout to listen for the next key
        const timeoutId = setTimeout(() => {
          document.removeEventListener('keydown', navHandler);
        }, 1000);

        const navHandler = (navEvent: KeyboardEvent) => {
          clearTimeout(timeoutId);
          document.removeEventListener('keydown', navHandler);
          navEvent.preventDefault();

          switch (navEvent.key) {
            case 'h':
              window.location.href = '/';
              break;
            case 't':
              window.location.href = '/tickets';
              break;
            case 'a':
              window.location.href = '/assets';
              break;
            case 'k':
              window.location.href = '/knowledge';
              break;
            case 's':
              window.location.href = '/settings';
              break;
          }
        };

        document.addEventListener('keydown', navHandler);
      }

      // Other shortcuts
      switch (event.key) {
        case 'c':
          if (!cmdKey) {
            event.preventDefault();
            // Trigger create new ticket
            console.log('Create new ticket shortcut');
          }
          break;
        
        case 'r':
          if (!cmdKey) {
            event.preventDefault();
            // Trigger refresh
            window.location.reload();
          }
          break;

        case '/':
          if (!cmdKey) {
            event.preventDefault();
            // Focus search - this would need to be implemented per page
            const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    showShortcuts,
    setShowShortcuts,
  };
};
