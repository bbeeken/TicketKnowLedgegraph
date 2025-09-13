import { FC, useState } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Select,
  useColorModeValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  Icon,
  Badge,
} from '@chakra-ui/react';
import {
  ChartBarIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

// Dynamically import charts to avoid SSR issues
const LineChart = dynamic(() => import('@/components/charts/LineChart'), { ssr: false });
const PieChart = dynamic(() => import('@/components/charts/PieChart'), { ssr: false });
const BarChart = dynamic(() => import('@/components/charts/BarChart'), { ssr: false });

const MotionBox = motion(Box);

interface AnalyticsData {
  ticketsByStatus: { status: string; count: number; color: string }[];
  alertsByType: { type: string; count: number; color: string }[];
  resolutionTime: { date: string; avgHours: number }[];
  assetUtilization: { asset: string; utilization: number }[];
}

const mockData: AnalyticsData = {
  ticketsByStatus: [
    { status: 'Open', count: 23, color: '#3182CE' },
    { status: 'In Progress', count: 15, color: '#38B2AC' },
    { status: 'Resolved', count: 45, color: '#48BB78' },
    { status: 'Closed', count: 67, color: '#9F7AEA' },
  ],
  alertsByType: [
    { type: 'Communication', count: 12, color: '#E53E3E' },
    { type: 'Hardware', count: 8, color: '#DD6B20' },
    { type: 'Software', count: 5, color: '#D69E2E' },
    { type: 'Network', count: 3, color: '#38B2AC' },
  ],
  resolutionTime: [
    { date: '2025-09-01', avgHours: 4.2 },
    { date: '2025-09-02', avgHours: 3.8 },
    { date: '2025-09-03', avgHours: 5.1 },
    { date: '2025-09-04', avgHours: 2.9 },
    { date: '2025-09-05', avgHours: 4.5 },
    { date: '2025-09-06', avgHours: 3.2 },
    { date: '2025-09-07', avgHours: 4.8 },
  ],
  assetUtilization: [
    { asset: 'ATG Systems', utilization: 85 },
    { asset: 'Fuel Dispensers', utilization: 72 },
    { asset: 'POS Terminals', utilization: 68 },
    { asset: 'Security Cameras', utilization: 91 },
  ],
};

export const AnalyticsDashboard: FC = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedSite, setSelectedSite] = useState('all');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');

  return (
    <VStack spacing={8} align="stretch">
      {/* Header */}
      <Flex justify="space-between" align="center">
        <Box>
          <Text
            fontSize="3xl"
            fontWeight="800"
            bgGradient="linear(to-r, purple.400, blue.500)"
            bgClip="text"
          >
            Analytics & Insights
          </Text>
          <Text color="gray.600" mt={2}>
            Deep insights into your operations and performance metrics
          </Text>
        </Box>
        <HStack spacing={4}>
          <Select
            placeholder="Select site"
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            w="200px"
          >
            <option value="all">All Sites</option>
            <option value="1006">Vermillion</option>
          </Select>
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            w="150px"
          >
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </Select>
        </HStack>
      </Flex>

      {/* Key Metrics */}
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
              <StatLabel fontSize="sm" color="gray.500">MTTR</StatLabel>
              <StatNumber fontSize="3xl" color="blue.600">3.2h</StatNumber>
              <StatHelpText color="green.500">↓ 12% from last period</StatHelpText>
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
              <StatLabel fontSize="sm" color="gray.500">Uptime</StatLabel>
              <StatNumber fontSize="3xl" color="green.600">99.7%</StatNumber>
              <StatHelpText color="green.500">↑ 0.3% from last period</StatHelpText>
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
              <StatLabel fontSize="sm" color="gray.500">Alert Response</StatLabel>
              <StatNumber fontSize="3xl" color="orange.600">8.5min</StatNumber>
              <StatHelpText color="red.500">↑ 2min from last period</StatHelpText>
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
              <StatLabel fontSize="sm" color="gray.500">Asset Efficiency</StatLabel>
              <StatNumber fontSize="3xl" color="purple.600">87%</StatNumber>
              <StatHelpText color="green.500">↑ 5% from last period</StatHelpText>
            </Stat>
          </Box>
        </MotionBox>
      </SimpleGrid>

      {/* Charts */}
      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>
            <Icon as={ChartBarIcon} mr={2} />
            Overview
          </Tab>
          <Tab>
            <Icon as={ClockIcon} mr={2} />
            Performance
          </Tab>
          <Tab>
            <Icon as={WrenchScrewdriverIcon} mr={2} />
            Assets
          </Tab>
          <Tab>
            <Icon as={ExclamationTriangleIcon} mr={2} />
            Alerts
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
              <MotionBox
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Box
                  bg={cardBg}
                  borderRadius="2xl"
                  p={6}
                  shadow="xl"
                  borderWidth="1px"
                  borderColor={borderColor}
                  h="400px"
                >
                  <Text fontSize="lg" fontWeight="semibold" mb={4}>
                    Tickets by Status
                  </Text>
                  <PieChart data={mockData.ticketsByStatus} />
                </Box>
              </MotionBox>

              <MotionBox
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Box
                  bg={cardBg}
                  borderRadius="2xl"
                  p={6}
                  shadow="xl"
                  borderWidth="1px"
                  borderColor={borderColor}
                  h="400px"
                >
                  <Text fontSize="lg" fontWeight="semibold" mb={4}>
                    Resolution Time Trend
                  </Text>
                  <LineChart data={mockData.resolutionTime} />
                </Box>
              </MotionBox>
            </SimpleGrid>
          </TabPanel>

          <TabPanel>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
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
                  h="400px"
                >
                  <Text fontSize="lg" fontWeight="semibold" mb={4}>
                    SLA Compliance
                  </Text>
                  <VStack spacing={4} align="stretch">
                    <Box>
                      <Flex justify="space-between" mb={2}>
                        <Text fontSize="sm">Critical Tickets</Text>
                        <Text fontSize="sm" fontWeight="semibold">95%</Text>
                      </Flex>
                      <Progress value={95} colorScheme="green" size="lg" borderRadius="md" />
                    </Box>
                    <Box>
                      <Flex justify="space-between" mb={2}>
                        <Text fontSize="sm">Major Tickets</Text>
                        <Text fontSize="sm" fontWeight="semibold">87%</Text>
                      </Flex>
                      <Progress value={87} colorScheme="yellow" size="lg" borderRadius="md" />
                    </Box>
                    <Box>
                      <Flex justify="space-between" mb={2}>
                        <Text fontSize="sm">Minor Tickets</Text>
                        <Text fontSize="sm" fontWeight="semibold">92%</Text>
                      </Flex>
                      <Progress value={92} colorScheme="blue" size="lg" borderRadius="md" />
                    </Box>
                  </VStack>
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
                  h="400px"
                >
                  <Text fontSize="lg" fontWeight="semibold" mb={4}>
                    Team Performance
                  </Text>
                  <VStack spacing={4} align="stretch">
                    <HStack justify="space-between">
                      <HStack>
                        <Icon as={CheckCircleIcon} color="green.500" />
                        <Text>Sarah Chen</Text>
                      </HStack>
                      <Text fontWeight="semibold">24 tickets</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <HStack>
                        <Icon as={CheckCircleIcon} color="green.500" />
                        <Text>Mike Rodriguez</Text>
                      </HStack>
                      <Text fontWeight="semibold">19 tickets</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <HStack>
                        <Icon as={CheckCircleIcon} color="yellow.500" />
                        <Text>John Smith</Text>
                      </HStack>
                      <Text fontWeight="semibold">15 tickets</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <HStack>
                        <Icon as={CheckCircleIcon} color="blue.500" />
                        <Text>Lisa Wong</Text>
                      </HStack>
                      <Text fontWeight="semibold">12 tickets</Text>
                    </HStack>
                  </VStack>
                </Box>
              </MotionBox>
            </SimpleGrid>
          </TabPanel>

          <TabPanel>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
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
                  h="400px"
                >
                  <Text fontSize="lg" fontWeight="semibold" mb={4}>
                    Asset Utilization
                  </Text>
                  <VStack spacing={4} align="stretch">
                    {mockData.assetUtilization.map((asset, index) => (
                      <Box key={asset.asset}>
                        <Flex justify="space-between" mb={2}>
                          <Text fontSize="sm">{asset.asset}</Text>
                          <Text fontSize="sm" fontWeight="semibold">{asset.utilization}%</Text>
                        </Flex>
                        <Progress
                          value={asset.utilization}
                          colorScheme={asset.utilization > 80 ? 'green' : asset.utilization > 60 ? 'yellow' : 'red'}
                          size="lg"
                          borderRadius="md"
                        />
                      </Box>
                    ))}
                  </VStack>
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
                  h="400px"
                >
                  <Text fontSize="lg" fontWeight="semibold" mb={4}>
                    Maintenance Schedule
                  </Text>
                  <VStack spacing={3} align="stretch">
                    <HStack justify="space-between" p={3} bg="red.50" borderRadius="md">
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="semibold">ATG System</Text>
                        <Text fontSize="sm" color="gray.600">Overdue by 2 days</Text>
                      </VStack>
                      <Badge colorScheme="red">Urgent</Badge>
                    </HStack>
                    <HStack justify="space-between" p={3} bg="yellow.50" borderRadius="md">
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="semibold">Fuel Dispenser</Text>
                        <Text fontSize="sm" color="gray.600">Due in 3 days</Text>
                      </VStack>
                      <Badge colorScheme="yellow">Soon</Badge>
                    </HStack>
                    <HStack justify="space-between" p={3} bg="green.50" borderRadius="md">
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="semibold">POS Terminal</Text>
                        <Text fontSize="sm" color="gray.600">Due in 2 weeks</Text>
                      </VStack>
                      <Badge colorScheme="green">Scheduled</Badge>
                    </HStack>
                  </VStack>
                </Box>
              </MotionBox>
            </SimpleGrid>
          </TabPanel>

          <TabPanel>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
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
                  h="400px"
                >
                  <Text fontSize="lg" fontWeight="semibold" mb={4}>
                    Alerts by Type
                  </Text>
                  <BarChart data={mockData.alertsByType} />
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
                  h="400px"
                >
                  <Text fontSize="lg" fontWeight="semibold" mb={4}>
                    Alert Trends
                  </Text>
                  <VStack spacing={4} align="stretch">
                    <Box>
                      <Flex justify="space-between" mb={2}>
                        <Text fontSize="sm">Communication Issues</Text>
                        <Text fontSize="sm" fontWeight="semibold" color="red.500">↑ 23%</Text>
                      </Flex>
                      <Progress value={77} colorScheme="red" size="lg" borderRadius="md" />
                    </Box>
                    <Box>
                      <Flex justify="space-between" mb={2}>
                        <Text fontSize="sm">Hardware Failures</Text>
                        <Text fontSize="sm" fontWeight="semibold" color="orange.500">↑ 15%</Text>
                      </Flex>
                      <Progress value={65} colorScheme="orange" size="lg" borderRadius="md" />
                    </Box>
                    <Box>
                      <Flex justify="space-between" mb={2}>
                        <Text fontSize="sm">Software Errors</Text>
                        <Text fontSize="sm" fontWeight="semibold" color="yellow.500">↓ 8%</Text>
                      </Flex>
                      <Progress value={42} colorScheme="yellow" size="lg" borderRadius="md" />
                    </Box>
                    <Box>
                      <Flex justify="space-between" mb={2}>
                        <Text fontSize="sm">Network Issues</Text>
                        <Text fontSize="sm" fontWeight="semibold" color="green.500">↓ 31%</Text>
                      </Flex>
                      <Progress value={19} colorScheme="green" size="lg" borderRadius="md" />
                    </Box>
                  </VStack>
                </Box>
              </MotionBox>
            </SimpleGrid>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  );
};

export default AnalyticsDashboard;
