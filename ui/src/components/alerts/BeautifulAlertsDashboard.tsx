import { FC, useState, useEffect } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Badge,
  IconButton,
  useColorModeValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  SimpleGrid,
  Avatar,
  Icon,
  Button,
  Select,
} from '@chakra-ui/react';
import {
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  BellAlertIcon,
  FunnelIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

interface Alert {
  id: string;
  site_id: number;
  alert_id: string;
  raised_at: string;
  code: string;
  level: string;
  asset_id?: number;
  asset_type?: string;
  zone_label?: string;
  ticket_id?: number;
  site_name?: string;
  acknowledged?: boolean;
}

// Mock data - replace with real API calls
const mockAlerts: Alert[] = [
  {
    id: '1',
    site_id: 1006,
    alert_id: 'ALERT-001',
    raised_at: '2025-09-09T10:30:00Z',
    code: 'ATG_COMM_ERR',
    level: 'critical',
    asset_id: 555,
    asset_type: 'ATG',
    zone_label: 'Island A',
    ticket_id: 123,
    site_name: 'Vermillion',
    acknowledged: false,
  },
  {
    id: '2',
    site_id: 1006,
    alert_id: 'ALERT-002',
    raised_at: '2025-09-09T11:15:00Z',
    code: 'FLOW_FAULT',
    level: 'major',
    asset_id: 321,
    asset_type: 'Dispenser',
    zone_label: 'Island B',
    ticket_id: 124,
    site_name: 'Vermillion',
    acknowledged: true,
  },
];

const getSeverityColor = (level: string) => {
  switch (level.toLowerCase()) {
    case 'critical': return 'red';
    case 'major': return 'orange';
    case 'minor': return 'yellow';
    default: return 'gray';
  }
};

const getSeverityIcon = (level: string) => {
  switch (level.toLowerCase()) {
    case 'critical': return ExclamationTriangleIcon;
    case 'major': return ClockIcon;
    default: return CheckCircleIcon;
  }
};

export const BeautifulAlertsDashboard: FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [filter, setFilter] = useState('all');
  const [selectedSite, setSelectedSite] = useState('all');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unacknowledged') return !alert.acknowledged;
    if (filter === 'acknowledged') return alert.acknowledged;
    return true;
  }).filter(alert => {
    if (selectedSite === 'all') return true;
    return alert.site_id.toString() === selectedSite;
  });

  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.level === 'critical').length,
    major: alerts.filter(a => a.level === 'major').length,
    acknowledged: alerts.filter(a => a.acknowledged).length,
  };

  return (
    <VStack spacing={8} align="stretch">
      {/* Header */}
      <Flex justify="space-between" align="center">
        <Box>
          <Text
            fontSize="3xl"
            fontWeight="800"
            bgGradient="linear(to-r, red.400, orange.500)"
            bgClip="text"
          >
            Alerts Dashboard
          </Text>
          <Text color="gray.600" mt={2}>
            Monitor and manage system alerts across all sites
          </Text>
        </Box>
        <HStack spacing={4}>
          <Select
            placeholder="Filter by site"
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            w="200px"
          >
            <option value="all">All Sites</option>
            <option value="1006">Vermillion</option>
          </Select>
          <Button leftIcon={<ArrowPathIcon width={16} />} variant="outline">
            Refresh
          </Button>
        </HStack>
      </Flex>

      {/* Stats Cards */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6}>
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Box
            bg={cardBg}
            borderRadius="2xl"
            p={6}
            shadow="xl"
            borderWidth="1px"
            borderColor={borderColor}
          >
            <Stat>
              <StatLabel fontSize="sm" color="gray.500">Total Alerts</StatLabel>
              <StatNumber fontSize="3xl" color="gray.900">{stats.total}</StatNumber>
              <StatHelpText>Active alerts</StatHelpText>
            </Stat>
          </Box>
        </MotionBox>

        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Box
            bg={cardBg}
            borderRadius="2xl"
            p={6}
            shadow="xl"
            borderWidth="1px"
            borderColor={borderColor}
          >
            <Stat>
              <StatLabel fontSize="sm" color="red.500">Critical</StatLabel>
              <StatNumber fontSize="3xl" color="red.600">{stats.critical}</StatNumber>
              <StatHelpText>Require immediate attention</StatHelpText>
            </Stat>
          </Box>
        </MotionBox>

        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Box
            bg={cardBg}
            borderRadius="2xl"
            p={6}
            shadow="xl"
            borderWidth="1px"
            borderColor={borderColor}
          >
            <Stat>
              <StatLabel fontSize="sm" color="orange.500">Major</StatLabel>
              <StatNumber fontSize="3xl" color="orange.600">{stats.major}</StatNumber>
              <StatHelpText>High priority issues</StatHelpText>
            </Stat>
          </Box>
        </MotionBox>

        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Box
            bg={cardBg}
            borderRadius="2xl"
            p={6}
            shadow="xl"
            borderWidth="1px"
            borderColor={borderColor}
          >
            <Stat>
              <StatLabel fontSize="sm" color="green.500">Acknowledged</StatLabel>
              <StatNumber fontSize="3xl" color="green.600">{stats.acknowledged}</StatNumber>
              <StatHelpText>Being worked on</StatHelpText>
            </Stat>
          </Box>
        </MotionBox>
      </SimpleGrid>

      {/* Alerts List */}
      <Box
        bg={cardBg}
        borderRadius="2xl"
        shadow="xl"
        borderWidth="1px"
        borderColor={borderColor}
        overflow="hidden"
      >
        <Flex p={6} borderBottomWidth="1px" borderColor={borderColor}>
          <HStack spacing={4}>
            <Icon as={BellAlertIcon} boxSize={6} color="gray.600" />
            <Text fontSize="xl" fontWeight="bold">Active Alerts</Text>
            <Badge colorScheme="red" fontSize="sm">{filteredAlerts.length}</Badge>
          </HStack>
          <Box flex={1} />
          <HStack spacing={2}>
            <Button
              size="sm"
              variant={filter === 'all' ? 'solid' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filter === 'unacknowledged' ? 'solid' : 'outline'}
              onClick={() => setFilter('unacknowledged')}
            >
              Unacknowledged
            </Button>
            <Button
              size="sm"
              variant={filter === 'acknowledged' ? 'solid' : 'outline'}
              onClick={() => setFilter('acknowledged')}
            >
              Acknowledged
            </Button>
          </HStack>
        </Flex>

        <VStack spacing={0} align="stretch">
          {filteredAlerts.map((alert, index) => {
            const SeverityIcon = getSeverityIcon(alert.level);
            const severityColor = getSeverityColor(alert.level);

            return (
              <MotionBox
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                borderBottomWidth="1px"
                borderColor={borderColor}
                _last={{ borderBottomWidth: 0 }}
              >
                <Box p={6} _hover={{ bg: hoverBg }}>
                  <Flex align="center" justify="space-between">
                    <HStack spacing={4} flex={1}>
                      <Box
                        p={2}
                        borderRadius="lg"
                        bg={`${severityColor}.100`}
                        color={`${severityColor}.600`}
                      >
                        <Icon as={SeverityIcon} boxSize={5} />
                      </Box>

                      <VStack align="start" spacing={1} flex={1}>
                        <HStack spacing={2}>
                          <Text fontWeight="semibold" fontSize="lg">
                            {alert.code}
                          </Text>
                          <Badge
                            colorScheme={severityColor}
                            textTransform="uppercase"
                            fontSize="xs"
                          >
                            {alert.level}
                          </Badge>
                          {alert.ticket_id && (
                            <Badge colorScheme="blue" fontSize="xs">
                              Ticket #{alert.ticket_id}
                            </Badge>
                          )}
                        </HStack>

                        <HStack spacing={4} color="gray.600" fontSize="sm">
                          <Text>{alert.site_name}</Text>
                          {alert.asset_type && <Text>• {alert.asset_type}</Text>}
                          {alert.zone_label && <Text>• {alert.zone_label}</Text>}
                        </HStack>

                        <Text color="gray.500" fontSize="sm">
                          {new Date(alert.raised_at).toLocaleString()}
                        </Text>
                      </VStack>
                    </HStack>

                    <HStack spacing={2}>
                      {!alert.acknowledged && (
                        <Button size="sm" colorScheme="blue" variant="outline">
                          Acknowledge
                        </Button>
                      )}
                      {alert.ticket_id ? (
                        <Button size="sm" colorScheme="green">
                          View Ticket
                        </Button>
                      ) : (
                        <Button size="sm" colorScheme="purple">
                          Create Ticket
                        </Button>
                      )}
                    </HStack>
                  </Flex>
                </Box>
              </MotionBox>
            );
          })}
        </VStack>
      </Box>
    </VStack>
  );
};

export default BeautifulAlertsDashboard;
