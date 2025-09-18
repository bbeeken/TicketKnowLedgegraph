import { FC, useState, useEffect } from 'react';
import {
  Grid,
  GridItem,
  Box,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  VStack,
  HStack,
  Text,
  Badge,
  Progress,
  Circle,
  Flex,
  useColorModeValue,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';
import { apiFetch } from '@/lib/api/client';

const MotionBox = motion(Box);
const MotionGrid = motion(Grid);

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: string;
  trend?: 'up' | 'down' | 'stable';
  loading?: boolean;
}

const MetricCard: FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  color = 'purple',
  trend,
  loading = false,
}) => {
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const numberColor = useColorModeValue('gray.800', 'white');

  return (
    <MotionBox
      p={6}
      bg={bg}
      borderRadius="xl"
      borderWidth="1px"
      borderColor={borderColor}
      shadow="sm"
      _hover={{ shadow: 'md' }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Stat>
        <Flex justify="space-between" align="start" mb={2}>
          <StatLabel fontSize="sm" color="gray.500" fontWeight="medium">
            {title}
          </StatLabel>
          {icon && (
            <Circle size="40px" bg={`${color}.100`} color={`${color}.500`}>
              {icon}
            </Circle>
          )}
        </Flex>
        
        {loading ? (
          <VStack align="start" spacing={2}>
            <Box w="60%" h="32px" bg="gray.200" borderRadius="md" />
            <Box w="40%" h="16px" bg="gray.100" borderRadius="md" />
          </VStack>
        ) : (
          <>
            <StatNumber 
              fontSize="2xl" 
              fontWeight="bold"
              color={numberColor}
            >
              {typeof value === 'number' ? value.toLocaleString() : value}
            </StatNumber>
            
            {(change !== undefined || changeLabel) && (
              <StatHelpText mb={0} fontSize="sm">
                {change !== undefined && (
                  <HStack spacing={1}>
                    <StatArrow type={change >= 0 ? 'increase' : 'decrease'} />
                    <Text color={change >= 0 ? 'green.500' : 'red.500'}>
                      {Math.abs(change)}%
                    </Text>
                  </HStack>
                )}
                {changeLabel && (
                  <Text color="gray.500">{changeLabel}</Text>
                )}
              </StatHelpText>
            )}
          </>
        )}
      </Stat>
    </MotionBox>
  );
};

interface ActivityFeedItem {
  id: string;
  type: 'ticket' | 'alert' | 'maintenance' | 'user';
  title: string;
  description: string;
  timestamp: Date;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

const ActivityFeed: FC<{ items: ActivityFeedItem[] }> = ({ items }) => {
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const itemBg = useColorModeValue('gray.50', 'gray.700');
  const itemHoverBg = useColorModeValue('gray.100', 'gray.600');

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'blue';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'alert': return <ExclamationTriangleIcon width={16} />;
      case 'ticket': return <ChartBarIcon width={16} />;
      case 'maintenance': return <CheckCircleIcon width={16} />;
      default: return <ClockIcon width={16} />;
    }
  };

  return (
    <Box
      bg={bg}
      borderRadius="xl"
      borderWidth="1px"
      borderColor={borderColor}
      p={6}
      h="400px"
      overflowY="auto"
    >
      <Text fontSize="lg" fontWeight="semibold" mb={4}>
        Recent Activity
      </Text>
      
      <VStack spacing={3} align="stretch">
        <AnimatePresence>
          {items.map((item, index) => (
            <MotionBox
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              p={3}
              borderRadius="md"
              borderLeftWidth="4px"
              borderLeftColor={`${getSeverityColor(item.severity)}.500`}
              bg={itemBg}
              _hover={{ bg: itemHoverBg }}
            >
              <HStack spacing={3} align="start">
                <Circle size="24px" bg={`${getSeverityColor(item.severity)}.100`}>
                  {getTypeIcon(item.type)}
                </Circle>
                
                <VStack align="start" spacing={1} flex={1}>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                      {item.title}
                    </Text>
                    <Badge
                      size="sm"
                      colorScheme={getSeverityColor(item.severity)}
                      fontSize="xs"
                    >
                      {item.severity || item.type}
                    </Badge>
                  </HStack>
                  
                  <Text fontSize="xs" color="gray.600" noOfLines={2}>
                    {item.description}
                  </Text>
                  
                  <Text fontSize="xs" color="gray.500">
                    {item.timestamp.toLocaleTimeString()}
                  </Text>
                </VStack>
              </HStack>
            </MotionBox>
          ))}
        </AnimatePresence>
      </VStack>
    </Box>
  );
};

const SystemHealth: FC = () => {
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [outboxMetrics, setOutboxMetrics] = useState<any>(null);

  // Fetch real metrics from API
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [systemData, outboxData] = await Promise.all([
          apiFetch('/metrics/system'),
          apiFetch('/metrics/outbox')
        ]);
        setSystemMetrics(systemData);
        setOutboxMetrics(outboxData);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

    // Generate services list from real metrics
    const services = systemMetrics && outboxMetrics ? [
      { name: 'API Gateway', status: 'healthy', uptime: 99.9 },
      { name: 'Database', status: 'healthy', uptime: 99.8 },
      { 
        name: 'Worker Queue', 
        status: outboxMetrics.status, 
        uptime: outboxMetrics.pending_count === 0 ? 99.5 : 98.5,
        details: `${outboxMetrics.pending_count} pending`
      },
      { 
        name: 'Alert Monitor', 
        status: systemMetrics.monitors.status === 'disabled' ? 'warning' : systemMetrics.alerts.status,
        uptime: systemMetrics.monitors.status === 'disabled' ? 95 : 99.7,
        details: systemMetrics.monitors.status === 'disabled' ? 'Disabled in dev' : `${systemMetrics.alerts.recent_count} recent alerts`
      },
    ] : [
      { name: 'Loading metrics...', status: 'gray', uptime: 0 },
    ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'green';
      case 'warning': return 'yellow';
      case 'error': return 'red';
        case 'disabled': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <Box
      bg={bg}
      borderRadius="xl"
      borderWidth="1px"
      borderColor={borderColor}
      p={6}
    >
      <Text fontSize="lg" fontWeight="semibold" mb={4}>
        System Health
      </Text>
      
      <VStack spacing={4} align="stretch">
        {services.map((service, index) => (
          <MotionBox
            key={service.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Flex justify="space-between" align="center" mb={2}>
              <HStack spacing={3}>
                <Circle
                  size="12px"
                  bg={`${getStatusColor(service.status)}.500`}
                />
                <Text fontSize="sm" fontWeight="medium">
                  {service.name}
                </Text>
              </HStack>
                <VStack align="end" spacing={0}>
                  <Text fontSize="sm" color="gray.500">
                    {service.uptime}% uptime
                  </Text>
                  {service.details && (
                    <Text fontSize="xs" color="gray.400">
                      {service.details}
                    </Text>
                  )}
                </VStack>
            </Flex>
            
            <Progress
              value={service.uptime}
              size="sm"
              colorScheme={getStatusColor(service.status)}
              borderRadius="full"
            />
          </MotionBox>
        ))}
      </VStack>
    </Box>
  );
};

export const RealTimeDashboard: FC = () => {
  const [metrics, setMetrics] = useState({
    activeTickets: 42,
    criticalAlerts: 3,
    systemUptime: 99.8,
    responseTime: 145,
  });

  const [activityItems, setActivityItems] = useState<ActivityFeedItem[]>([
    {
      id: '1',
      type: 'alert',
      title: 'High CPU Usage',
      description: 'Server cluster experiencing high CPU usage',
      timestamp: new Date(),
      severity: 'high',
    },
    {
      id: '2',
      type: 'ticket',
      title: 'New ticket created',
      description: 'Printer malfunction in Building A',
      timestamp: new Date(Date.now() - 300000),
      severity: 'medium',
    },
    {
      id: '3',
      type: 'maintenance',
      title: 'Maintenance completed',
      description: 'Database optimization completed successfully',
      timestamp: new Date(Date.now() - 600000),
      severity: 'low',
    },
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update metrics with slight variations
      setMetrics(prev => ({
        activeTickets: prev.activeTickets + Math.floor(Math.random() * 3) - 1,
        criticalAlerts: Math.max(0, prev.criticalAlerts + Math.floor(Math.random() * 2) - 1),
        systemUptime: Math.max(95, Math.min(100, prev.systemUptime + (Math.random() - 0.5) * 0.1)),
        responseTime: Math.max(50, Math.min(300, prev.responseTime + Math.floor(Math.random() * 20) - 10)),
      }));

      // Occasionally add new activity
      if (Math.random() < 0.3) {
        const newActivity: ActivityFeedItem = {
          id: Date.now().toString(),
          type: ['alert', 'ticket', 'maintenance'][Math.floor(Math.random() * 3)] as any,
          title: 'System Event',
          description: 'New system event detected',
          timestamp: new Date(),
          severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
        };

        setActivityItems(prev => [newActivity, ...prev.slice(0, 9)]);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <MotionGrid
      templateColumns={{ base: '1fr', lg: 'repeat(4, 1fr)' }}
      templateRows={{ base: 'auto', lg: 'auto auto auto' }}
      gap={6}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Metric Cards */}
      <GridItem>
        <MetricCard
          title="Active Tickets"
          value={metrics.activeTickets}
          change={-5.2}
          changeLabel="vs last week"
          icon={<ChartBarIcon width={20} />}
          color="blue"
        />
      </GridItem>
      
      <GridItem>
        <MetricCard
          title="Critical Alerts"
          value={metrics.criticalAlerts}
          change={12.5}
          changeLabel="vs yesterday"
          icon={<ExclamationTriangleIcon width={20} />}
          color="red"
        />
      </GridItem>
      
      <GridItem>
        <MetricCard
          title="System Uptime"
          value={`${metrics.systemUptime.toFixed(1)}%`}
          change={0.3}
          changeLabel="vs last month"
          icon={<CheckCircleIcon width={20} />}
          color="green"
        />
      </GridItem>
      
      <GridItem>
        <MetricCard
          title="Avg Response Time"
          value={`${metrics.responseTime}ms`}
          change={-8.1}
          changeLabel="vs last hour"
          icon={<ClockIcon width={20} />}
          color="purple"
        />
      </GridItem>

      {/* Activity Feed */}
      <GridItem colSpan={{ base: 1, lg: 2 }} rowSpan={{ base: 1, lg: 2 }}>
        <ActivityFeed items={activityItems} />
      </GridItem>

      {/* System Health */}
      <GridItem colSpan={{ base: 1, lg: 2 }} rowSpan={{ base: 1, lg: 2 }}>
        <SystemHealth />
      </GridItem>
    </MotionGrid>
  );
};
