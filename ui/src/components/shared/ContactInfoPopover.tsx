import React from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
  PopoverHeader,
  PopoverBody,
  VStack,
  HStack,
  Text,
  Avatar,
  Badge,
  Icon,
  Box,
  Link,
  useColorModeValue
} from '@chakra-ui/react';
import { 
  EnvelopeIcon, 
  PhoneIcon, 
  UserIcon,
  IdentificationIcon 
} from '@heroicons/react/24/outline';

interface ContactInfo {
  user_id?: number;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  watcher_type?: string;
  user_name?: string; // For watchers
}

interface ContactInfoPopoverProps {
  contact: ContactInfo;
  children: React.ReactElement;
  title?: string;
}

export const ContactInfoPopover: React.FC<ContactInfoPopoverProps> = ({
  contact,
  children,
  title
}) => {
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textPrimary = useColorModeValue('gray.900', 'white');
  const textSecondary = useColorModeValue('gray.600', 'gray.400');

  const displayName = contact.name || contact.user_name || 'Unknown User';
  const displayEmail = contact.email;
  const displayPhone = contact.phone;
  const displayRole = contact.role;
  const watcherType = contact.watcher_type;

  return (
    <Popover placement="auto" isLazy>
      <PopoverTrigger>
        {children}
      </PopoverTrigger>
      <PopoverContent bg={bg} borderColor={borderColor} shadow="xl" maxW="300px">
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverHeader borderColor={borderColor}>
          <HStack>
            <Avatar size="sm" name={displayName} />
            <VStack align="start" spacing={0}>
              <Text fontWeight="semibold" color={textPrimary} fontSize="sm">
                {title || 'Contact Information'}
              </Text>
              {watcherType && (
                <Badge size="sm" colorScheme="blue" variant="subtle">
                  {watcherType}
                </Badge>
              )}
            </VStack>
          </HStack>
        </PopoverHeader>
        <PopoverBody>
          <VStack align="stretch" spacing={3}>
            {/* Name */}
            <HStack>
              <Icon as={UserIcon} w={4} h={4} color={textSecondary} />
              <Text fontSize="sm" color={textPrimary} fontWeight="medium">
                {displayName}
              </Text>
            </HStack>

            {/* Email */}
            {displayEmail && (
              <HStack>
                <Icon as={EnvelopeIcon} w={4} h={4} color={textSecondary} />
                <Link 
                  href={`mailto:${displayEmail}`} 
                  fontSize="sm" 
                  color="blue.500"
                  _hover={{ textDecoration: 'underline' }}
                >
                  {displayEmail}
                </Link>
              </HStack>
            )}

            {/* Phone */}
            {displayPhone && (
              <HStack>
                <Icon as={PhoneIcon} w={4} h={4} color={textSecondary} />
                <Link 
                  href={`tel:${displayPhone}`} 
                  fontSize="sm" 
                  color="blue.500"
                  _hover={{ textDecoration: 'underline' }}
                >
                  {displayPhone}
                </Link>
              </HStack>
            )}

            {/* Role */}
            {displayRole && (
              <HStack>
                <Icon as={IdentificationIcon} w={4} h={4} color={textSecondary} />
                <Text fontSize="sm" color={textPrimary}>
                  {displayRole}
                </Text>
              </HStack>
            )}

            {/* User ID for debugging */}
            {contact.user_id && (
              <HStack>
                <Text fontSize="xs" color={textSecondary}>
                  ID: {contact.user_id}
                </Text>
              </HStack>
            )}

            {/* If no contact info available */}
            {!displayEmail && !displayPhone && !displayRole && (
              <Text fontSize="sm" color={textSecondary} fontStyle="italic">
                No additional contact information available
              </Text>
            )}
          </VStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};