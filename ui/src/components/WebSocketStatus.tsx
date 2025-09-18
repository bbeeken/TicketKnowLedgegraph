import React from 'react';
import {
  Box,
  Flex,
  Icon,
  Text,
  Tooltip,
  Badge,
  useColorModeValue
} from '@chakra-ui/react';
import { FiWifi, FiWifiOff, FiLoader } from 'react-icons/fi';
import { useTicketWebSocket } from '../hooks/useTicketWebSocket';

interface WebSocketStatusProps {
  showText?: boolean;
  variant?: 'minimal' | 'detailed';
}

export function WebSocketStatus({ showText = false, variant = 'minimal' }: WebSocketStatusProps) {
  const { isConnected, connectionState, subscriptions } = useTicketWebSocket();
  
  // Define all color values at the top level to avoid conditional hook calls
  const connectedColor = useColorModeValue('green.500', 'green.300');
  const connectingColor = useColorModeValue('yellow.500', 'yellow.300');
  const disconnectedColor = useColorModeValue('gray.400', 'gray.500');
  const errorColor = useColorModeValue('red.500', 'red.300');
  
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const mutedTextColor = useColorModeValue('gray.500', 'gray.500');

  const statusColor = {
    connected: connectedColor,
    connecting: connectingColor,
    disconnected: disconnectedColor,
    error: errorColor
  };

  const getStatusIcon = () => {
    switch (connectionState) {
      case 'connected':
        return FiWifi;
      case 'connecting':
        return FiLoader;
      case 'disconnected':
      case 'error':
      default:
        return FiWifiOff;
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Real-time updates active';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection error';
      default:
        return 'Unknown status';
    }
  };

  const getStatusBadgeText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Live';
      case 'connecting':
        return 'Connecting';
      case 'disconnected':
        return 'Offline';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const subscriptionCount = (subscriptions.ticketIds?.length || 0) + 
                          (subscriptions.siteIds?.length || 0) +
                          (subscriptions.allTickets ? 1 : 0);

  if (variant === 'detailed') {
    return (
      <Box
        p={3}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="md"
        bg={bgColor}
      >
        <Flex align="center" justify="space-between" mb={2}>
          <Flex align="center" gap={2}>
            <Icon
              as={getStatusIcon()}
              color={statusColor[connectionState]}
              animation={connectionState === 'connecting' ? 'spin 1s linear infinite' : undefined}
            />
            <Text fontWeight="medium" fontSize="sm">
              Real-time Updates
            </Text>
          </Flex>
          <Badge 
            colorScheme={
              connectionState === 'connected' ? 'green' : 
              connectionState === 'connecting' ? 'yellow' : 
              connectionState === 'error' ? 'red' : 'gray'
            }
            variant="subtle"
          >
            {getStatusBadgeText()}
          </Badge>
        </Flex>
        
        <Text fontSize="xs" color={textColor}>
          {getStatusText()}
        </Text>
        
        {connectionState === 'connected' && subscriptionCount > 0 && (
          <Text fontSize="xs" color={mutedTextColor} mt={1}>
            {subscriptionCount} active subscription{subscriptionCount !== 1 ? 's' : ''}
          </Text>
        )}
      </Box>
    );
  }

  // Minimal variant
  const content = (
    <Flex align="center" gap={showText ? 2 : 0}>
      <Icon
        as={getStatusIcon()}
        color={statusColor[connectionState]}
        w={4}
        h={4}
        animation={connectionState === 'connecting' ? 'spin 1s linear infinite' : undefined}
      />
      {showText && (
        <Text fontSize="sm" color={statusColor[connectionState]}>
          {getStatusBadgeText()}
        </Text>
      )}
    </Flex>
  );

  return (
    <Tooltip 
      label={`${getStatusText()}${subscriptionCount > 0 ? ` • ${subscriptionCount} subscription${subscriptionCount !== 1 ? 's' : ''}` : ''}`}
      placement="bottom"
    >
      {content}
    </Tooltip>
  );
}