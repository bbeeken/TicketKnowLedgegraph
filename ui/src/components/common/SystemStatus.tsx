import { FC, useState, useEffect } from 'react';
import {
  Box,
  HStack,
  Text,
  Tooltip,
  Circle,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  VStack,
  Badge,
  Flex,
  useColorModeValue,
} from '@chakra-ui/react';
import { formatDistanceToNow } from 'date-fns';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  lastCheck: Date;
  responseTime?: number;
  details?: string;
  url?: string;
}

const mockServices: ServiceStatus[] = [
  {
    name: 'API Server',
    status: 'healthy',
    lastCheck: new Date(),
    responseTime: 45,
    details: 'All endpoints responding normally',
    url: '/api/health',
  },
  {
    name: 'Database',
    status: 'healthy',
    lastCheck: new Date(Date.now() - 30000),
    responseTime: 12,
    details: 'Connection pool: 8/20 active',
  },
  {
    name: 'Worker Queue',
    status: 'warning',
    lastCheck: new Date(Date.now() - 60000),
    responseTime: 156,
    details: 'High queue length: 45 pending jobs',
  },
  {
    name: 'Alert Monitor',
    status: 'error',
    lastCheck: new Date(Date.now() - 5 * 60000),
    details: 'Connection timeout to external monitoring service',
  },
];

export const SystemStatus: FC = () => {
  const [services, setServices] = useState<ServiceStatus[]>(mockServices);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  // Simulate real-time status updates
  useEffect(() => {
    const interval = setInterval(() => {
      setServices(prev => prev.map(service => {
        // Randomly update service status
        const shouldUpdate = Math.random() < 0.1; // 10% chance per update
        
        if (shouldUpdate) {
          const statuses: ServiceStatus['status'][] = ['healthy', 'warning', 'error'];
          const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
          
          return {
            ...service,
            status: randomStatus,
            lastCheck: new Date(),
            responseTime: Math.floor(Math.random() * 200) + 10,
          };
        }
        
        return service;
      }));
      
      setLastUpdate(new Date());
    }, 15000); // Update every 15 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy': return 'green';
      case 'warning': return 'yellow';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const getStatusText = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy': return 'Healthy';
      case 'warning': return 'Warning';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  const getOverallStatus = () => {
    const hasError = services.some(s => s.status === 'error');
    const hasWarning = services.some(s => s.status === 'warning');
    
    if (hasError) return 'error';
    if (hasWarning) return 'warning';
    return 'healthy';
  };

  const overallStatus = getOverallStatus();
  const healthyCount = services.filter(s => s.status === 'healthy').length;

  return (
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <Box cursor="pointer" _hover={{ opacity: 0.8 }}>
          <Tooltip
            label={`System Status: ${getStatusText(overallStatus)}`}
            placement="bottom"
          >
            <HStack spacing={2}>
              <Circle
                size="8px"
                bg={`${getStatusColor(overallStatus)}.500`}
                shadow={`0 0 8px ${getStatusColor(overallStatus)}.300`}
              />
              <Text fontSize="sm" color="gray.600">
                {healthyCount}/{services.length} services
              </Text>
            </HStack>
          </Tooltip>
        </Box>
      </PopoverTrigger>

      <PopoverContent w="350px" bg={bg} borderColor={borderColor} shadow="xl">
        <PopoverHeader>
          <Flex justify="space-between" align="center">
            <Text fontWeight="semibold">System Status</Text>
            <Badge
              colorScheme={getStatusColor(overallStatus)}
              fontSize="xs"
            >
              {getStatusText(overallStatus)}
            </Badge>
          </Flex>
          <Text fontSize="xs" color="gray.500">
            Last updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}
          </Text>
        </PopoverHeader>

        <PopoverBody p={0}>
          <VStack spacing={0} align="stretch">
            {services.map((service, index) => (
              <Box
                key={service.name}
                p={4}
                borderBottom={index < services.length - 1 ? '1px' : 'none'}
                borderColor={borderColor}
                _hover={{ bg: hoverBg }}
              >
                <Flex justify="space-between" align="start" mb={2}>
                  <HStack spacing={3}>
                    <Circle
                      size="12px"
                      bg={`${getStatusColor(service.status)}.500`}
                    />
                    <Text fontWeight="medium" fontSize="sm">
                      {service.name}
                    </Text>
                  </HStack>
                  
                  <VStack spacing={1} align="end">
                    <Badge
                      colorScheme={getStatusColor(service.status)}
                      fontSize="xs"
                      variant="subtle"
                    >
                      {getStatusText(service.status)}
                    </Badge>
                    {service.responseTime && (
                      <Text fontSize="xs" color="gray.500">
                        {service.responseTime}ms
                      </Text>
                    )}
                  </VStack>
                </Flex>

                {service.details && (
                  <Text fontSize="xs" color="gray.600" mb={2}>
                    {service.details}
                  </Text>
                )}

                <HStack justify="space-between">
                  <Text fontSize="xs" color="gray.500">
                    {formatDistanceToNow(service.lastCheck, { addSuffix: true })}
                  </Text>
                  {service.url && (
                    <Text
                      fontSize="xs"
                      color="blue.500"
                      cursor="pointer"
                      _hover={{ textDecoration: 'underline' }}
                      onClick={() => window.open(service.url, '_blank')}
                    >
                      View Details
                    </Text>
                  )}
                </HStack>
              </Box>
            ))}
          </VStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

// Component for inline status indicator
export const StatusIndicator: FC<{ status: ServiceStatus['status']; size?: string }> = ({ 
  status, 
  size = '8px' 
}) => {
  return (
    <Circle
      size={size}
      bg={`${getStatusColor(status)}.500`}
      shadow={`0 0 6px ${getStatusColor(status)}.300`}
    />
  );
};

// Hook for checking system health
export const useSystemHealth = () => {
  const [isHealthy, setIsHealthy] = useState(true);
  const [lastCheck, setLastCheck] = useState(new Date());

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health');
        setIsHealthy(response.ok);
        setLastCheck(new Date());
      } catch (error) {
        setIsHealthy(false);
        setLastCheck(new Date());
      }
    };

    // Initial check
    checkHealth();

    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return { isHealthy, lastCheck };
};

// Helper function (used in both components)
const getStatusColor = (status: ServiceStatus['status']) => {
  switch (status) {
    case 'healthy': return 'green';
    case 'warning': return 'yellow';
    case 'error': return 'red';
    default: return 'gray';
  }
};
