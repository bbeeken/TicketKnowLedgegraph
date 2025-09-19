import React from 'react';
import { Box, HStack, Icon, Text, Tooltip } from '@chakra-ui/react';
import { FiWifi, FiWifiOff, FiAlertTriangle } from 'react-icons/fi';

interface ConnectionStatusProps {
  isConnected: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' | 'degraded';
  connectionQuality: 'good' | 'poor' | 'failed';
  showText?: boolean;
  size?: 'sm' | 'md';
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  connectionState,
  connectionQuality,
  showText = false,
  size = 'sm'
}) => {
  const getStatusConfig = () => {
    if (connectionState === 'degraded') {
      return {
        icon: FiWifiOff,
        color: 'orange.500',
        text: 'Real-time updates unavailable',
        tooltip: 'Real-time updates are temporarily unavailable. The app will continue to function with manual refresh.'
      };
    }
    
    if (isConnected && connectionQuality === 'good') {
      return {
        icon: FiWifi,
        color: 'green.500',
        text: 'Connected',
        tooltip: 'Real-time updates are active'
      };
    }
    
    if (connectionState === 'connecting') {
      return {
        icon: FiWifi,
        color: 'yellow.500',
        text: 'Connecting...',
        tooltip: 'Establishing real-time connection...'
      };
    }
    
    if (connectionQuality === 'poor') {
      return {
        icon: FiAlertTriangle,
        color: 'orange.500',
        text: 'Unstable connection',
        tooltip: 'Real-time connection is unstable. Some updates may be delayed.'
      };
    }
    
    return {
      icon: FiWifiOff,
      color: 'red.500',
      text: 'Offline',
      tooltip: 'Real-time updates are not available. Please refresh the page manually for updates.'
    };
  };

  const config = getStatusConfig();
  const iconSize = size === 'sm' ? 14 : 16;
  const textSize = size === 'sm' ? 'xs' : 'sm';

  return (
    <Tooltip label={config.tooltip} hasArrow placement="top">
      <HStack spacing={1} cursor="help">
        <Icon 
          as={config.icon} 
          color={config.color} 
          boxSize={iconSize}
          opacity={connectionState === 'connecting' ? 0.7 : 1}
        />
        {showText && (
          <Text fontSize={textSize} color={config.color} fontWeight="medium">
            {config.text}
          </Text>
        )}
      </HStack>
    </Tooltip>
  );
};

export default ConnectionStatus;