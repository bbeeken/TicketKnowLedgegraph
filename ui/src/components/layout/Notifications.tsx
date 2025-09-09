import { FC } from 'react';
import {
  Box,
  IconButton,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  VStack,
  Divider,
} from '@chakra-ui/react';
import { BellIcon } from '@heroicons/react/24/outline';

export const Notifications: FC = () => {
  const notificationCount = 3;

  return (
    <Menu>
      <MenuButton
        as={IconButton}
        aria-label="Notifications"
        icon={
          <Box position="relative">
            <BellIcon width={24} />
            {notificationCount > 0 && (
              <Badge
                position="absolute"
                top="-2px"
                right="-2px"
                colorScheme="red"
                borderRadius="full"
                minW="20px"
                h="20px"
                fontSize="xs"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                {notificationCount}
              </Badge>
            )}
          </Box>
        }
        variant="ghost"
        _hover={{ bg: 'gray.100' }}
      />
      <MenuList w="300px">
        <Box p={3}>
          <Text fontWeight="bold" mb={2}>
            Notifications
          </Text>
        </Box>
        <Divider />
        <VStack spacing={0} align="stretch">
          <MenuItem p={3}>
            <Box>
              <Text fontSize="sm" fontWeight="medium">
                New alert in Building A
              </Text>
              <Text fontSize="xs" color="gray.500">
                2 minutes ago
              </Text>
            </Box>
          </MenuItem>
          <MenuItem p={3}>
            <Box>
              <Text fontSize="sm" fontWeight="medium">
                Ticket #1234 assigned to you
              </Text>
              <Text fontSize="xs" color="gray.500">
                15 minutes ago
              </Text>
            </Box>
          </MenuItem>
          <MenuItem p={3}>
            <Box>
              <Text fontSize="sm" fontWeight="medium">
                System maintenance scheduled
              </Text>
              <Text fontSize="xs" color="gray.500">
                1 hour ago
              </Text>
            </Box>
          </MenuItem>
        </VStack>
        <Divider />
        <MenuItem justifyContent="center" color="purple.500">
          View all notifications
        </MenuItem>
      </MenuList>
    </Menu>
  );
};
