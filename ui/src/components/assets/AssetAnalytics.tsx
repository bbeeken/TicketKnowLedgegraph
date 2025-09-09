import { FC } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Card,
  CardBody,
  Grid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Select,
  useColorModeValue,
  Progress,
  Badge,
} from '@chakra-ui/react';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

// Mock analytics data
const analyticsData = {
  assetTypeDistribution: [
    { type: 'Fuel Systems', count: 24, percentage: 35 },
    { type: 'POS Systems', count: 18, percentage: 26 },
    { type: 'Network Equipment', count: 15, percentage: 22 },
    { type: 'HVAC Systems', count: 8, percentage: 12 },
    { type: 'Security Systems', count: 3, percentage: 5 },
  ],
  statusDistribution: [
    { status: 'Operational', count: 58, percentage: 85, color: 'green' },
    { status: 'Warning', count: 7, percentage: 10, color: 'yellow' },
    { status: 'Critical', count: 2, percentage: 3, color: 'red' },
    { status: 'Maintenance', count: 1, percentage: 2, color: 'blue' },
  ],
  uptimeByType: [
    { type: 'Fuel Systems', uptime: 99.2, trend: 'up' },
    { type: 'POS Systems', uptime: 97.8, trend: 'down' },
    { type: 'Network Equipment', uptime: 99.9, trend: 'up' },
    { type: 'HVAC Systems', uptime: 94.5, trend: 'up' },
    { type: 'Security Systems', uptime: 98.7, trend: 'stable' },
  ],
  maintenanceCosts: {
    thisMonth: 12450,
    lastMonth: 8930,
    thisYear: 89340,
    projected: 125000,
  },
  topIssues: [
    { issue: 'Filter Replacement', frequency: 15, avgCost: 85 },
    { issue: 'Display Calibration', frequency: 12, avgCost: 120 },
    { issue: 'Pump Cleaning', frequency: 8, avgCost: 95 },
    { issue: 'Software Update', frequency: 6, avgCost: 45 },
    { issue: 'Card Reader Issue', frequency: 5, avgCost: 180 },
  ],
};

export const AssetAnalytics: FC = () => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <Flex justify="space-between" align="center">
        <Box>
          <Text fontSize="3xl" fontWeight="800" bgGradient="linear(to-r, brand.400, purple.500)" bgClip="text">
            Asset Analytics
          </Text>
          <Text color="gray.500" mt={1}>
            Insights and trends across your asset portfolio
          </Text>
        </Box>
        <Select maxW="200px" defaultValue="30days">
          <option value="7days">Last 7 days</option>
          <option value="30days">Last 30 days</option>
          <option value="90days">Last 90 days</option>
          <option value="1year">Last year</option>
        </Select>
      </Flex>

      {/* Key Metrics */}
      <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={6}>
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Stat>
              <StatLabel>Maintenance Costs</StatLabel>
              <StatNumber color="green.500">${analyticsData.maintenanceCosts.thisMonth.toLocaleString()}</StatNumber>
              <StatHelpText>
                <HStack>
                  <ArrowTrendingUpIcon className="w-4 h-4 text-red-500" />
                  <Text color="red.500">+39% from last month</Text>
                </HStack>
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Stat>
              <StatLabel>Average Uptime</StatLabel>
              <StatNumber color="blue.500">98.2%</StatNumber>
              <StatHelpText>
                <HStack>
                  <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                  <Text color="green.500">+2.1% from last month</Text>
                </HStack>
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Stat>
              <StatLabel>Critical Assets</StatLabel>
              <StatNumber color="red.500">2</StatNumber>
              <StatHelpText>
                <HStack>
                  <ArrowTrendingDownIcon className="w-4 h-4 text-green-500" />
                  <Text color="green.500">-3 from last week</Text>
                </HStack>
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Stat>
              <StatLabel>Scheduled Maintenance</StatLabel>
              <StatNumber color="purple.500">8</StatNumber>
              <StatHelpText>
                <Text color="gray.500">Next 30 days</Text>
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </Grid>

      {/* Charts and Analysis */}
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
        {/* Asset Type Distribution */}
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Text fontSize="lg" fontWeight="semibold" mb={4}>Asset Distribution by Type</Text>
            <VStack spacing={4}>
              {analyticsData.assetTypeDistribution.map((item, index) => (
                <Box key={index} w="full">
                  <Flex justify="space-between" mb={2}>
                    <Text fontSize="sm">{item.type}</Text>
                    <Text fontSize="sm" color="gray.500">{item.count} assets</Text>
                  </Flex>
                  <Progress value={item.percentage} colorScheme="brand" size="sm" />
                </Box>
              ))}
            </VStack>
          </CardBody>
        </Card>

        {/* Status Distribution */}
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Text fontSize="lg" fontWeight="semibold" mb={4}>Asset Status Distribution</Text>
            <VStack spacing={4}>
              {analyticsData.statusDistribution.map((item, index) => (
                <Flex key={index} w="full" justify="space-between" align="center">
                  <HStack>
                    <Badge colorScheme={item.color} variant="solid">
                      {item.status}
                    </Badge>
                    <Text fontSize="sm">{item.count} assets</Text>
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">{item.percentage}%</Text>
                </Flex>
              ))}
            </VStack>
          </CardBody>
        </Card>
      </Grid>

      {/* Uptime Analysis */}
      <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <CardBody>
          <Text fontSize="lg" fontWeight="semibold" mb={4}>Uptime by Asset Type</Text>
          <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
            {analyticsData.uptimeByType.map((item, index) => (
              <Box key={index} p={4} borderRadius="md" bg="gray.50" _dark={{ bg: 'gray.700' }}>
                <VStack spacing={2}>
                  <Text fontSize="sm" fontWeight="medium">{item.type}</Text>
                  <HStack>
                    <Text fontSize="xl" fontWeight="bold" color="blue.500">
                      {item.uptime}%
                    </Text>
                    {item.trend === 'up' && <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />}
                    {item.trend === 'down' && <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />}
                    {item.trend === 'stable' && <Text fontSize="xs" color="gray.500">stable</Text>}
                  </HStack>
                  <Progress 
                    value={item.uptime} 
                    size="sm" 
                    w="full"
                    colorScheme={item.uptime > 98 ? 'green' : item.uptime > 95 ? 'yellow' : 'red'}
                  />
                </VStack>
              </Box>
            ))}
          </Grid>
        </CardBody>
      </Card>

      {/* Top Issues */}
      <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <CardBody>
          <Text fontSize="lg" fontWeight="semibold" mb={4}>Most Common Issues</Text>
          <VStack spacing={3}>
            {analyticsData.topIssues.map((item, index) => (
              <Flex key={index} w="full" justify="space-between" align="center" p={3} borderRadius="md" bg="gray.50" _dark={{ bg: 'gray.700' }}>
                <VStack align="start" spacing={1}>
                  <Text fontWeight="medium">{item.issue}</Text>
                  <Text fontSize="sm" color="gray.500">Occurred {item.frequency} times</Text>
                </VStack>
                <VStack align="end" spacing={1}>
                  <Text fontWeight="bold" color="orange.500">${item.avgCost}</Text>
                  <Text fontSize="sm" color="gray.500">avg cost</Text>
                </VStack>
              </Flex>
            ))}
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
};
