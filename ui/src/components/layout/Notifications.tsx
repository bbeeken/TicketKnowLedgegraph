import { FC, useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Divider,
  useColorModeValue,
  Avatar,
  Flex,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import {
  BellIcon,
  CheckIcon,
  XMarkIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  avatar?: string;
  source?: string;
}

// Mock notifications for demo
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Critical Alert',
    message: 'POS System down at Store #42',
    type: 'error',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    read: false,
    actionUrl: '/alerts/1',
    source: 'MonitoringSystem',
  },
  {
    id: '2',
    title: 'Ticket Assigned',
    message: 'Ticket #1247 has been assigned to you',
    type: 'info',
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    read: false,
    actionUrl: '/tickets/1247',
    source: 'Sarah Chen',
    avatar: 'SC',
  },
  {
    id: '3',
    title: 'Maintenance Complete',
    message: 'Scheduled maintenance for fuel dispensers completed successfully',
    type: 'success',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    read: true,
    actionUrl: '/assets',
    source: 'MaintenanceBot',
  },
];

export const Notifications: FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [isOpen, setIsOpen] = useState(false);
  
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const unreadBg = useColorModeValue('blue.50', 'blue.900');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  const unreadCount = notifications.filter(n => !n.read).length;

  // Simulate real-time notifications
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly add new notification (demo purposes)
      if (Math.random() < 0.1) { // 10% chance every 30 seconds
        const newNotification: Notification = {
          id: Date.now().toString(),
          title: 'New Alert',
          message: 'System monitoring detected an anomaly',
          type: 'warning',
          timestamp: new Date(),
          read: false,
          source: 'AutoMonitor',
        };
        setNotifications(prev => [newNotification, ...prev]);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'error': return 'red';
      case 'warning': return 'orange';
      case 'success': return 'green';
      default: return 'blue';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'error': return '🚨';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      default: return 'ℹ️';
    }
  };

  return (
    <Popover
      isOpen={isOpen}
      onOpen={() => setIsOpen(true)}
      onClose={() => setIsOpen(false)}
      placement="bottom-end"
    >
      <PopoverTrigger>
        <Box position="relative">
          <IconButton
            aria-label="Notifications"
            icon={unreadCount > 0 ? <BellSolidIcon width={20} /> : <BellIcon width={20} />}
            variant="ghost"
            color={unreadCount > 0 ? 'brand.500' : 'gray.500'}
            _hover={{ color: 'brand.600', bg: 'brand.50' }}
          />
          {unreadCount > 0 && (
            <Badge
              colorScheme="red"
              borderRadius="full"
              fontSize="xs"
              position="absolute"
              top="-1"
              right="-1"
              minW="20px"
              h="20px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Box>
      </PopoverTrigger>

      <PopoverContent w="400px" bg={bg} borderColor={borderColor} shadow="xl">
        <PopoverHeader>
          <Flex justify="space-between" align="center">
            <Text fontWeight="semibold" fontSize="lg">
              Notifications
            </Text>
            <HStack spacing={2}>
              {unreadCount > 0 && (
                <Button size="sm" variant="ghost" onClick={markAllAsRead}>
                  Mark all read
                </Button>
              )}
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<Cog6ToothIcon width={16} />}
                  size="sm"
                  variant="ghost"
                  aria-label="Notification settings"
                />
                <MenuList>
                  <MenuItem>Notification Settings</MenuItem>
                  <MenuItem>Mute for 1 hour</MenuItem>
                  <MenuItem>Clear all</MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </Flex>
        </PopoverHeader>

        <PopoverBody p={0} maxH="400px" overflowY="auto">
          {notifications.length === 0 ? (
            <Box p={8} textAlign="center">
              <Text color="gray.500">No notifications</Text>
            </Box>
          ) : (
            <VStack spacing={0} align="stretch">
              {notifications.map((notification, index) => (
                <Box key={notification.id}>
                  <Box
                    p={4}
                    bg={notification.read ? 'transparent' : unreadBg}
                    _hover={{ bg: hoverBg }}
                    cursor="pointer"
                    onClick={() => {
                      markAsRead(notification.id);
                      if (notification.actionUrl) {
                        window.location.href = notification.actionUrl;
                      }
                    }}
                  >
                    <Flex gap={3}>
                      <Box flexShrink={0} mt={1}>
                        {notification.avatar ? (
                          <Avatar size="sm" name={notification.source} />
                        ) : (
                          <Box
                            w={8}
                            h={8}
                            borderRadius="full"
                            bg={`${getTypeColor(notification.type)}.100`}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            fontSize="sm"
                          >
                            {getTypeIcon(notification.type)}
                          </Box>
                        )}
                      </Box>
                      
                      <Box flex={1}>
                        <HStack justify="space-between" align="start" mb={1}>
                          <Text
                            fontWeight={notification.read ? 'normal' : 'semibold'}
                            fontSize="sm"
                            noOfLines={1}
                          >
                            {notification.title}
                          </Text>
                          <HStack spacing={1}>
                            <Tooltip label="Mark as read">
                              <IconButton
                                icon={<CheckIcon width={14} />}
                                size="xs"
                                variant="ghost"
                                aria-label="Mark as read"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                opacity={notification.read ? 0.5 : 1}
                              />
                            </Tooltip>
                            <Tooltip label="Remove">
                              <IconButton
                                icon={<XMarkIcon width={14} />}
                                size="xs"
                                variant="ghost"
                                aria-label="Remove notification"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                              />
                            </Tooltip>
                          </HStack>
                        </HStack>
                        
                        <Text
                          fontSize="sm"
                          color="gray.600"
                          noOfLines={2}
                          mb={2}
                        >
                          {notification.message}
                        </Text>
                        
                        <HStack justify="space-between">
                          <Text fontSize="xs" color="gray.500">
                            {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                          </Text>
                          {notification.source && (
                            <Text fontSize="xs" color="gray.500">
                              from {notification.source}
                            </Text>
                          )}
                        </HStack>
                      </Box>
                    </Flex>
                  </Box>
                  {index < notifications.length - 1 && <Divider />}
                </Box>
              ))}
            </VStack>
          )}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};
