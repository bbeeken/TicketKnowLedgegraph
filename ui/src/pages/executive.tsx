import { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Select,
  useColorModeValue,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Progress,
  Icon,
  Badge,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';
import {
  ChartBarIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  CpuChipIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

// Dynamically import charts to avoid SSR issues
const LineChart = dynamic(() => import('@/components/charts/LineChart'), { ssr: false });
const PieChart = dynamic(() => import('@/components/charts/PieChart'), { ssr: false });
const BarChart = dynamic(() => import('@/components/charts/BarChart'), { ssr: false });

const MotionBox = motion(Box);

interface ExecutiveMetrics {
  // Core KPIs
  totalSites: number;
  activeSites: number;
  totalAssets: number;
  criticalAlerts: number;
  openTickets: number;
  avgResolutionTime: number;
  slaCompliance: number;
  mttr: number; // Mean Time To Resolution

  // Trends (percentage change from last period)
  alertsTrend: number;
  ticketsTrend: number;
  resolutionTimeTrend: number;
  slaComplianceTrend: number;

  // Site Performance
  sitePerformance: Array<{
    siteId: number;
    siteName: string;
    uptime: number;
    alertsCount: number;
    ticketsCount: number;
    avgResolutionTime: number;
  }>;

  // Predictive Analytics
  predictedFailures: Array<{
    assetId: number;
    assetName: string;
    siteName: string;
    failureProbability: number;
    predictedDate: string;
    recommendedAction: string;
  }>;

  // Cost Analytics
  monthlyCosts: Array<{
    month: string;
    maintenanceCost: number;
    downtimeCost: number;
    totalCost: number;
  }>;

  // Team Performance
  teamMetrics: Array<{
    teamId: number;
    teamName: string;
    activeTickets: number;
    resolvedToday: number;
    avgResolutionTime: number;
    slaCompliance: number;
  }>;
}

const mockExecutiveData: ExecutiveMetrics = {
  totalSites: 7,
  activeSites: 6,
  totalAssets: 1250,
  criticalAlerts: 12,
  openTickets: 89,
  avgResolutionTime: 4.2,
  slaCompliance: 94.5,
  mttr: 3.8,

  alertsTrend: -8.5,
  ticketsTrend: 12.3,
  resolutionTimeTrend: -15.2,
  slaComplianceTrend: 2.1,

  sitePerformance: [
    { siteId: 1001, siteName: 'Downtown', uptime: 99.8, alertsCount: 2, ticketsCount: 15, avgResolutionTime: 3.2 },
    { siteId: 1002, siteName: 'North Side', uptime: 99.5, alertsCount: 4, ticketsCount: 22, avgResolutionTime: 4.8 },
    { siteId: 1003, siteName: 'South Plaza', uptime: 99.9, alertsCount: 1, ticketsCount: 8, avgResolutionTime: 2.1 },
    { siteId: 1004, siteName: 'East Point', uptime: 98.7, alertsCount: 8, ticketsCount: 35, avgResolutionTime: 6.2 },
    { siteId: 1005, siteName: 'West Mall', uptime: 99.6, alertsCount: 3, ticketsCount: 18, avgResolutionTime: 3.9 },
    { siteId: 1006, siteName: 'Central Hub', uptime: 99.4, alertsCount: 6, ticketsCount: 28, avgResolutionTime: 4.5 },
    { siteId: 1007, siteName: 'Airport', uptime: 97.2, alertsCount: 15, ticketsCount: 42, avgResolutionTime: 7.8 },
  ],

  predictedFailures: [
    {
      assetId: 1234,
      assetName: 'Fuel Pump #3',
      siteName: 'Downtown',
      failureProbability: 85,
      predictedDate: '2025-09-15',
      recommendedAction: 'Schedule preventive maintenance',
    },
    {
      assetId: 5678,
      assetName: 'HVAC Unit B',
      siteName: 'North Side',
      failureProbability: 72,
      predictedDate: '2025-09-18',
      recommendedAction: 'Replace air filters and check refrigerant',
    },
    {
      assetId: 9012,
      assetName: 'POS Terminal #5',
      siteName: 'East Point',
      failureProbability: 68,
      predictedDate: '2025-09-22',
      recommendedAction: 'Update software and check connections',
    },
  ],

  monthlyCosts: [
    { month: 'Jul 2025', maintenanceCost: 45000, downtimeCost: 12000, totalCost: 57000 },
    { month: 'Aug 2025', maintenanceCost: 52000, downtimeCost: 8500, totalCost: 60500 },
    { month: 'Sep 2025', maintenanceCost: 48000, downtimeCost: 15000, totalCost: 63000 },
  ],

  teamMetrics: [
    { teamId: 1, teamName: 'Field Techs A', activeTickets: 12, resolvedToday: 8, avgResolutionTime: 3.2, slaCompliance: 96.5 },
    { teamId: 2, teamName: 'Field Techs B', activeTickets: 15, resolvedToday: 6, avgResolutionTime: 4.8, slaCompliance: 92.1 },
    { teamId: 3, teamName: 'Remote Support', activeTickets: 8, resolvedToday: 12, avgResolutionTime: 2.1, slaCompliance: 98.7 },
  ],
};

export default function ExecutiveDashboard() {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedSite, setSelectedSite] = useState('all');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handlePredictionClick = (prediction: any) => {
    setSelectedPrediction(prediction);
    onOpen();
  };

  const getTrendIcon = (trend: number) => {
    return trend > 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return trend > 10 ? 'red.500' : 'orange.500';
    return trend < -10 ? 'green.500' : 'blue.500';
  };

  return (
    <Box p={6} bg={useColorModeValue('gray.50', 'gray.900')} minH="100vh">
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Box>
            <Text fontSize="3xl" fontWeight="bold" color={useColorModeValue('gray.900', 'white')}>
              Executive Dashboard
            </Text>
            <Text fontSize="md" color={useColorModeValue('gray.600', 'gray.400')}>
              Real-time operational insights and predictive analytics
            </Text>
          </Box>
          <HStack spacing={4}>
            <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} w="150px">
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </Select>
            <Select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)} w="200px">
              <option value="all">All Sites</option>
              {mockExecutiveData.sitePerformance.map(site => (
                <option key={site.siteId} value={site.siteId.toString()}>{site.siteName}</option>
              ))}
            </Select>
          </HStack>
        </Flex>

        {/* Core KPIs */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6}>
          <MotionBox
            bg={bgColor}
            p={6}
            borderRadius="lg"
            border="1px"
            borderColor={borderColor}
            shadow="sm"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Stat>
              <StatLabel fontSize="sm" color="gray.500">Active Sites</StatLabel>
              <StatNumber fontSize="2xl" color="blue.600">
                {mockExecutiveData.activeSites}/{mockExecutiveData.totalSites}
              </StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                85.7% operational
              </StatHelpText>
            </Stat>
            <Icon as={BuildingStorefrontIcon} w={8} h={8} color="blue.500" mt={2} />
          </MotionBox>

          <MotionBox
            bg={bgColor}
            p={6}
            borderRadius="lg"
            border="1px"
            borderColor={borderColor}
            shadow="sm"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Stat>
              <StatLabel fontSize="sm" color="gray.500">Critical Alerts</StatLabel>
              <StatNumber fontSize="2xl" color="red.600">
                {mockExecutiveData.criticalAlerts}
              </StatNumber>
              <StatHelpText color={getTrendColor(mockExecutiveData.alertsTrend)}>
                <Icon as={getTrendIcon(mockExecutiveData.alertsTrend)} w={4} h={4} mr={1} />
                {Math.abs(mockExecutiveData.alertsTrend)}% from last period
              </StatHelpText>
            </Stat>
            <Icon as={ExclamationTriangleIcon} w={8} h={8} color="red.500" mt={2} />
          </MotionBox>

          <MotionBox
            bg={bgColor}
            p={6}
            borderRadius="lg"
            border="1px"
            borderColor={borderColor}
            shadow="sm"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Stat>
              <StatLabel fontSize="sm" color="gray.500">Open Tickets</StatLabel>
              <StatNumber fontSize="2xl" color="orange.600">
                {mockExecutiveData.openTickets}
              </StatNumber>
              <StatHelpText color={getTrendColor(mockExecutiveData.ticketsTrend)}>
                <Icon as={getTrendIcon(mockExecutiveData.ticketsTrend)} w={4} h={4} mr={1} />
                {Math.abs(mockExecutiveData.ticketsTrend)}% from last period
              </StatHelpText>
            </Stat>
            <Icon as={WrenchScrewdriverIcon} w={8} h={8} color="orange.500" mt={2} />
          </MotionBox>

          <MotionBox
            bg={bgColor}
            p={6}
            borderRadius="lg"
            border="1px"
            borderColor={borderColor}
            shadow="sm"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Stat>
              <StatLabel fontSize="sm" color="gray.500">SLA Compliance</StatLabel>
              <StatNumber fontSize="2xl" color="green.600">
                {mockExecutiveData.slaCompliance}%
              </StatNumber>
              <StatHelpText color={getTrendColor(-mockExecutiveData.slaComplianceTrend)}>
                <Icon as={getTrendIcon(-mockExecutiveData.slaComplianceTrend)} w={4} h={4} mr={1} />
                {Math.abs(mockExecutiveData.slaComplianceTrend)}% from last period
              </StatHelpText>
            </Stat>
            <Icon as={ShieldCheckIcon} w={8} h={8} color="green.500" mt={2} />
          </MotionBox>
        </SimpleGrid>

        {/* Charts Row */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          {/* Site Performance Chart */}
          <MotionBox
            bg={bgColor}
            p={6}
            borderRadius="lg"
            border="1px"
            borderColor={borderColor}
            shadow="sm"
          >
            <Text fontSize="xl" fontWeight="bold" mb={4}>Site Performance Overview</Text>
            <BarChart
              data={mockExecutiveData.sitePerformance.map(site => ({
                type: site.siteName,
                count: site.uptime,
                color: site.uptime > 99 ? '#48BB78' : site.uptime > 95 ? '#ECC94B' : '#F56565',
              }))}
            />
          </MotionBox>

          {/* Cost Analysis Chart */}
          <MotionBox
            bg={bgColor}
            p={6}
            borderRadius="lg"
            border="1px"
            borderColor={borderColor}
            shadow="sm"
          >
            <Text fontSize="xl" fontWeight="bold" mb={4}>Monthly Cost Analysis</Text>
            <LineChart
              data={mockExecutiveData.monthlyCosts.map(cost => ({
                date: cost.month,
                avgHours: cost.totalCost,
              }))}
            />
          </MotionBox>
        </SimpleGrid>

        {/* Predictive Analytics */}
        <MotionBox
          bg={bgColor}
          p={6}
          borderRadius="lg"
          border="1px"
          borderColor={borderColor}
          shadow="sm"
        >
          <Flex justify="space-between" align="center" mb={4}>
            <Text fontSize="xl" fontWeight="bold">Predictive Maintenance Alerts</Text>
            <Badge colorScheme="red" fontSize="sm">
              {mockExecutiveData.predictedFailures.length} High-Risk Assets
            </Badge>
          </Flex>

          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {mockExecutiveData.predictedFailures.map((failure, index) => (
              <MotionBox
                key={failure.assetId}
                p={4}
                borderRadius="md"
                border="1px"
                borderColor="red.200"
                bg="red.50"
                cursor="pointer"
                whileHover={{ scale: 1.02 }}
                onClick={() => handlePredictionClick(failure)}
              >
                <HStack justify="space-between" mb={2}>
                  <Badge colorScheme="red">{failure.failureProbability}% Risk</Badge>
                  <Text fontSize="sm" color="gray.600">{failure.predictedDate}</Text>
                </HStack>
                <Text fontWeight="semibold" mb={1}>{failure.assetName}</Text>
                <Text fontSize="sm" color="gray.600" mb={2}>{failure.siteName}</Text>
                <Text fontSize="sm" color="red.700">{failure.recommendedAction}</Text>
              </MotionBox>
            ))}
          </SimpleGrid>
        </MotionBox>

        {/* Team Performance */}
        <MotionBox
          bg={bgColor}
          p={6}
          borderRadius="lg"
          border="1px"
          borderColor={borderColor}
          shadow="sm"
        >
          <Text fontSize="xl" fontWeight="bold" mb={4}>Team Performance</Text>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {mockExecutiveData.teamMetrics.map((team) => (
              <Box key={team.teamId} p={4} borderRadius="md" border="1px" borderColor={borderColor}>
                <Text fontWeight="semibold" mb={3}>{team.teamName}</Text>
                <VStack spacing={2} align="stretch">
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.600">Active Tickets:</Text>
                    <Text fontSize="sm" fontWeight="semibold">{team.activeTickets}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.600">Resolved Today:</Text>
                    <Text fontSize="sm" fontWeight="semibold" color="green.600">{team.resolvedToday}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.600">Avg Resolution:</Text>
                    <Text fontSize="sm" fontWeight="semibold">{team.avgResolutionTime}h</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.600">SLA Compliance:</Text>
                    <Text fontSize="sm" fontWeight="semibold" color="green.600">{team.slaCompliance}%</Text>
                  </HStack>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        </MotionBox>
      </VStack>

      {/* Prediction Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Maintenance Prediction Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedPrediction && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="semibold" mb={2}>Asset Information</Text>
                  <Text>Asset: {selectedPrediction.assetName}</Text>
                  <Text>Site: {selectedPrediction.siteName}</Text>
                  <Text>Asset ID: {selectedPrediction.assetId}</Text>
                </Box>

                <Box>
                  <Text fontWeight="semibold" mb={2}>Risk Assessment</Text>
                  <HStack>
                    <Text>Failure Probability:</Text>
                    <Badge colorScheme="red" ml={2}>{selectedPrediction.failureProbability}%</Badge>
                  </HStack>
                  <Text>Predicted Failure Date: {selectedPrediction.predictedDate}</Text>
                </Box>

                <Box>
                  <Text fontWeight="semibold" mb={2}>Recommended Action</Text>
                  <Text>{selectedPrediction.recommendedAction}</Text>
                </Box>

                <HStack spacing={4} pt={4}>
                  <Button colorScheme="blue" flex={1}>
                    Schedule Maintenance
                  </Button>
                  <Button variant="outline" flex={1}>
                    View Asset Details
                  </Button>
                </HStack>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
