import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Input,
  VStack,
  HStack,
  Text,
  Avatar,
  Spinner,
  useOutsideClick,
  useColorModeValue,
  Portal
} from '@chakra-ui/react';
import { User, searchUsers } from '../../lib/api/users';

interface UserDropdownProps {
  value?: User | null;
  onChange: (user: User | null) => void;
  placeholder?: string;
  isDisabled?: boolean;
  excludeUserIds?: number[];
}

export const UserDropdown: React.FC<UserDropdownProps> = ({
  value,
  onChange,
  placeholder = "Search users...",
  isDisabled = false,
  excludeUserIds = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const bg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.600');
  
  useOutsideClick({
    ref: ref,
    handler: () => setIsOpen(false),
  });

  // Update input value when value prop changes
  useEffect(() => {
    if (value) {
      setInputValue(value.name);
    } else {
      setInputValue('');
    }
  }, [value]);

  // Search users when search query changes
  useEffect(() => {
    if (searchQuery.length >= 2) {
      setLoading(true);
      searchUsers(searchQuery, 10)
        .then(results => {
          const filteredResults = results.filter(user => 
            !excludeUserIds.includes(user.user_id)
          );
          setUsers(filteredResults);
        })
        .catch(error => {
          console.error('Failed to search users:', error);
          setUsers([]);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setUsers([]);
    }
  }, [searchQuery, excludeUserIds]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSearchQuery(newValue);
    setIsOpen(true);
    
    if (!newValue) {
      onChange(null);
    }
  };

  const handleUserSelect = (user: User) => {
    setInputValue(user.name);
    setSearchQuery('');
    setIsOpen(false);
    onChange(user);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (inputValue && !value) {
      setSearchQuery(inputValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Box position="relative" ref={ref}>
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        isDisabled={isDisabled}
        autoComplete="off"
      />
      
      {isOpen && (
        <Portal>
          <Box
            position="absolute"
            top="100%"
            left="0"
            right="0"
            bg={bg}
            border="1px"
            borderColor={borderColor}
            borderRadius="md"
            shadow="lg"
            maxH="200px"
            overflowY="auto"
            zIndex={9999}
            style={{
              position: 'absolute',
              top: inputRef.current ? 
                inputRef.current.getBoundingClientRect().bottom + window.scrollY + 4 : 0,
              left: inputRef.current ? 
                inputRef.current.getBoundingClientRect().left + window.scrollX : 0,
              width: inputRef.current ? 
                inputRef.current.getBoundingClientRect().width : 'auto'
            }}
          >
            {loading ? (
              <Box p={3} textAlign="center">
                <Spinner size="sm" />
              </Box>
            ) : users.length > 0 ? (
              <VStack spacing={0} align="stretch">
                {users.map(user => (
                  <Box
                    key={user.user_id}
                    p={2}
                    cursor="pointer"
                    _hover={{ bg: hoverBg }}
                    onClick={() => handleUserSelect(user)}
                  >
                    <HStack spacing={2}>
                      <Avatar size="sm" name={user.name} bg="brand.500">
                        {getInitials(user.name)}
                      </Avatar>
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontSize="sm" fontWeight="medium">
                          {user.name}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {user.email}
                        </Text>
                      </VStack>
                      {user.role && (
                        <Text fontSize="xs" color="gray.400">
                          {user.role}
                        </Text>
                      )}
                    </HStack>
                  </Box>
                ))}
              </VStack>
            ) : searchQuery.length >= 2 ? (
              <Box p={3}>
                <Text fontSize="sm" color="gray.500">
                  No users found
                </Text>
              </Box>
            ) : (
              <Box p={3}>
                <Text fontSize="sm" color="gray.500">
                  Type at least 2 characters to search
                </Text>
              </Box>
            )}
          </Box>
        </Portal>
      )}
    </Box>
  );
};
