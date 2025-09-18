import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  useColorModeValue,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  Icon,
  Divider,
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Progress,
  CircularProgress,
  CircularProgressLabel,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Select
} from '@chakra-ui/react';
import { 
  ChevronRightIcon, 
  ArrowLeftIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CogIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

export default function AssetAnalyticsPage() {
  const router = useRouter();
  const { assetId, timeRange = '30' } = router.query;
  const [loading, setLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange as string);
  const [asset, setAsset] = useState<any>(null);
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textPrimary = useColorModeValue('gray.900', 'white');
  const textSecondary = useColorModeValue('gray.600', 'gray.300');


  // State for dynamic data
  const [assetData, setAssetData] = useState<any>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any[]>([]);
  const [alertsData, setAlertsData] = useState<any[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<any[]>([]);
  const [utilizationData, setUtilizationData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setDataLoading(true);
      setDataError(null);
      try {
        // Asset analytics
        const assetRes = await fetch(`/api/assets/${assetId}/analytics`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('opsgraph_token')}` }
        });
        if (!assetRes.ok) throw new Error('Failed to load asset analytics');
        const assetJson = await assetRes.json();
        setAssetData(assetJson.asset || assetJson);
        setPerformanceMetrics(assetJson.performanceMetrics || []);
        setUtilizationData(assetJson.utilizationData || []);

        // Alerts for this asset
        const alertsRes = await fetch(`/api/alerts?asset_id=${assetId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('opsgraph_token')}` }
        });
        if (!alertsRes.ok) throw new Error('Failed to load alerts');
        const alertsJson = await alertsRes.json();
        setAlertsData(alertsJson.alerts || alertsJson);

        // Maintenance history
        const maintRes = await fetch(`/api/assets/${assetId}/maintenance`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('opsgraph_token')}` }
        });
        if (!maintRes.ok) throw new Error('Failed to load maintenance history');
        const maintJson = await maintRes.json();
        setMaintenanceHistory(maintJson.maintenance || maintJson);
      } catch (err: any) {
        setDataError(err.message || 'Failed to load analytics data');
      } finally {
        setDataLoading(false);
      }
    };
    if (assetId) fetchAll();
  }, [assetId]);

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  };

  return (
    <Box bg={bgColor} minH="100vh" py={8}>
      <Container maxW="container.xl">
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <Box>
            <Breadcrumb spacing="8px" separator={<ChevronRightIcon width={16} />}>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => router.back()} color="blue.500">
                  Tickets
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbLink color="blue.500">Assets</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem isCurrentPage>
                <BreadcrumbLink>Analytics</BreadcrumbLink>
              </BreadcrumbItem>
            </Breadcrumb>
            
            <HStack justify="space-between" align="center" mt={4}>
              <VStack align="start" spacing={1}>
                <Heading size="lg" color={textPrimary}>
                  📊 Asset Analytics
                </Heading>
                {assetData && (
                  <Text color={textSecondary}>
                    {assetData.name} • {assetData.type} • {assetData.location}
                  </Text>
                )}
              </VStack>
              <HStack spacing={3}>
                <Select 
                  value={selectedTimeRange} 
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                  size="sm"
                  w="auto"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last year</option>
                </Select>
                <Button 
                  leftIcon={<Icon as={ArrowLeftIcon} />} 
                  variant="outline" 
                  onClick={() => router.back()}
                >
                  Back to Ticket
                </Button>
              </HStack>
            </HStack>
          </Box>

          <Divider />

          {dataError ? (
            <Box textAlign="center" py={8}>
              <Alert status="error"><AlertIcon />{dataError}</Alert>
            </Box>
          ) : dataLoading ? (
            <Box textAlign="center" py={8}>
              <Spinner size="xl" />
              <Text mt={4} color={textSecondary}>Loading analytics data...</Text>
            </Box>
          ) : (
            <>
              {/* Health Score Overview */}
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
                <Card bg={cardBg} shadow="md" borderColor={borderColor}>
                  <CardBody textAlign="center">
                    <CircularProgress 
                      value={assetData?.healthScore || 0} 
                      color={getHealthScoreColor(assetData?.healthScore || 0)}
                      size="120px"
                      thickness="12px"
                    >
                      <CircularProgressLabel>
                        <VStack spacing={0}>
                          <Text fontSize="2xl" fontWeight="bold">
                            {assetData?.healthScore}
                          </Text>
                          <Text fontSize="xs" color={textSecondary}>
                            Health Score
                          </Text>
                        </VStack>
                      </CircularProgressLabel>
                    </CircularProgress>
                  </CardBody>
                </Card>

                <Card bg={cardBg} shadow="md" borderColor={borderColor}>
                  <CardHeader pb={2}>
                    <HStack spacing={2}>
                      <Icon as={ClockIcon} color="blue.500" />
                      <Text fontSize="sm" fontWeight="semibold">Uptime</Text>
                    </HStack>
                  </CardHeader>
                  <CardBody pt={0}>
                    <VStack align="start" spacing={2}>
                      <Text fontSize="2xl" fontWeight="bold" color={textPrimary}>
                        {asset?.uptimePercentage}%
                      </Text>
                      <Progress 
                        value={asset?.uptimePercentage || 0} 
                        colorScheme="green" 
                        size="sm" 
                        w="full"
                      />
                      <Text fontSize="xs" color={textSecondary}>
                        Last {selectedTimeRange} days
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>

                <Card bg={cardBg} shadow="md" borderColor={borderColor}>
                  <CardHeader pb={2}>
                    <HStack spacing={2}>
                      <Icon as={BoltIcon} color="yellow.500" />
                      <Text fontSize="sm" fontWeight="semibold">Energy Usage</Text>
                    </HStack>
                  </CardHeader>
                  <CardBody pt={0}>
                    <VStack align="start" spacing={2}>
                      <Text fontSize="2xl" fontWeight="bold" color={textPrimary}>
                        {asset?.energyConsumption} kWh
                      </Text>
                      <Badge colorScheme="green" size="sm">
                        -5.2% from last month
                      </Badge>
                      <Text fontSize="xs" color={textSecondary}>
                        Daily average
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>

                <Card bg={cardBg} shadow="md" borderColor={borderColor}>
                  <CardHeader pb={2}>
                    <HStack spacing={2}>
                      <Icon as={CogIcon} color="purple.500" />
                      <Text fontSize="sm" fontWeight="semibold">Maintenance Cost</Text>
                    </HStack>
                  </CardHeader>
                  <CardBody pt={0}>
                    <VStack align="start" spacing={2}>
                      <Text fontSize="2xl" fontWeight="bold" color={textPrimary}>
                        ${asset?.maintenanceCost}
                      </Text>
                      <Badge colorScheme="yellow" size="sm">
                        +12% from last period
                      </Badge>
                      <Text fontSize="xs" color={textSecondary}>
                        Last {selectedTimeRange} days
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              </SimpleGrid>

              {/* Performance Metrics */}
              <Card bg={cardBg} shadow="md" borderColor={borderColor}>
                <CardHeader>
                  <HStack spacing={2}>
                    <Icon as={ChartBarIcon} color="purple.500" />
                    <Heading size="md">Performance Metrics</Heading>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6}>
                    {performanceMetrics.map((metric, index) => (
                      <Stat key={index}>
                        <StatLabel fontSize="sm" color={textSecondary}>
                          {metric.label}
                        </StatLabel>
                        <StatNumber fontSize="xl" color={textPrimary}>
                          {metric.value}
                        </StatNumber>
                        {metric.trend && (
                          <StatHelpText>
                            <StatArrow type={metric.trend as any} />
                            {metric.change}
                          </StatHelpText>
                        )}
                      </Stat>
                    ))}
                  </SimpleGrid>
                </CardBody>
              </Card>

              {/* Tabs for Detailed Analytics */}
              <Tabs variant="enclosed" colorScheme="purple">
                <TabList>
                  <Tab>
                    <HStack spacing={2}>
                      <Icon as={ExclamationTriangleIcon} />
                      <Text>Alerts & Issues</Text>
                    </HStack>
                  </Tab>
                  <Tab>
                    <HStack spacing={2}>
                      <Icon as={CogIcon} />
                      <Text>Maintenance History</Text>
                    </HStack>
                  </Tab>
                  <Tab>
                    <HStack spacing={2}>
                      <Icon as={ChartBarIcon} />
                      <Text>Usage Patterns</Text>
                    </HStack>
                  </Tab>
                </TabList>

                <TabPanels>
                  {/* Alerts Tab */}
                  <TabPanel px={0}>
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                      {alertsData.map((alert, index) => (
                        <Card key={index} bg={cardBg} shadow="md" borderColor={borderColor}>
                          <CardBody textAlign="center">
                            <VStack spacing={3}>
                              <Badge 
                                colorScheme={alert.color || (alert.level === 'critical' ? 'red' : alert.level === 'major' ? 'yellow' : 'blue')} 
                                size="lg" 
                                px={3} 
                                py={1}
                                borderRadius="full"
                              >
                                {alert.severity || alert.level}
                              </Badge>
                              <Text fontSize="3xl" fontWeight="bold" color={textPrimary}>
                                {alert.count || alert.total || 1}
                              </Text>
                              <Text fontSize="sm" color={textSecondary}>
                                Last {selectedTimeRange} days
                              </Text>
                            </VStack>
                          </CardBody>
                        </Card>
                      ))}
                    </SimpleGrid>
                    
                    <Card bg={cardBg} shadow="md" borderColor={borderColor} mt={6}>
                      <CardHeader>
                        <Heading size="sm">Recent Alerts</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={3} align="stretch">
                          <HStack justify="space-between" p={3} bg="yellow.50" borderRadius="md">
                            <HStack spacing={3}>
                              <Icon as={ExclamationTriangleIcon} color="yellow.500" />
                              <VStack align="start" spacing={0}>
                                <Text fontSize="sm" fontWeight="semibold">
                                  Temperature Above Normal
                                </Text>
                                <Text fontSize="xs" color={textSecondary}>
                                  2 hours ago
                                </Text>
                              </VStack>
                            </HStack>
                            <Badge colorScheme="yellow">Warning</Badge>
                          </HStack>
                          
                          <HStack justify="space-between" p={3} bg="red.50" borderRadius="md">
                            <HStack spacing={3}>
                              <Icon as={ExclamationTriangleIcon} color="red.500" />
                              <VStack align="start" spacing={0}>
                                <Text fontSize="sm" fontWeight="semibold">
                                  Communication Error
                                </Text>
                                <Text fontSize="xs" color={textSecondary}>
                                  1 day ago
                                </Text>
                              </VStack>
                            </HStack>
                            <Badge colorScheme="red">Critical</Badge>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>
                  </TabPanel>

                  {/* Maintenance History Tab */}
                  <TabPanel px={0}>
                    <TableContainer>
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Date</Th>
                            <Th>Type</Th>
                            <Th>Description</Th>
                            <Th>Duration</Th>
                            <Th>Cost</Th>
                            <Th>Technician</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {maintenanceHistory.map((maintenance, index) => (
                            <Tr key={index}>
                              <Td>{maintenance.date || maintenance.performed_at}</Td>
                              <Td>
                                <Badge 
                                  colorScheme={maintenance.type === 'Preventive' ? 'green' : 'orange'}
                                  size="sm"
                                >
                                  {maintenance.type}
                                </Badge>
                              </Td>
                              <Td>{maintenance.description}</Td>
                              <Td>{maintenance.duration}</Td>
                              <Td>${maintenance.cost}</Td>
                              <Td>{maintenance.technician}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </TabPanel>

                  {/* Usage Patterns Tab */}
                  <TabPanel px={0}>
                    <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                      <Card bg={cardBg} shadow="md" borderColor={borderColor}>
                        <CardHeader>
                          <Heading size="sm">Daily Usage Pattern</Heading>
                        </CardHeader>
                        <CardBody>
                          <VStack spacing={3} align="stretch">
                            {utilizationData.map((data, index) => (
                              <HStack key={index} justify="space-between">
                                <Text fontSize="sm" color={textSecondary}>
                                  {data.hour}
                                </Text>
                                <HStack spacing={3} flex={1} maxW="200px">
                                  <Progress 
                                    value={data.usage} 
                                    colorScheme="blue" 
                                    size="sm" 
                                    flex={1}
                                  />
                                  <Text fontSize="sm" minW="40px">
                                    {data.usage}%
                                  </Text>
                                </HStack>
                              </HStack>
                            ))}
                          </VStack>
                        </CardBody>
                      </Card>

                      <Card bg={cardBg} shadow="md" borderColor={borderColor}>
                        <CardHeader>
                          <Heading size="sm">Peak Usage Times</Heading>
                        </CardHeader>
                        <CardBody>
                          <VStack spacing={4} align="stretch">
                            <HStack justify="space-between" p={3} bg="blue.50" borderRadius="md">
                              <VStack align="start" spacing={0}>
                                <Text fontSize="sm" fontWeight="semibold">
                                  Morning Rush
                                </Text>
                                <Text fontSize="xs" color={textSecondary}>
                                  7:00 AM - 9:00 AM
                                </Text>
                              </VStack>
                              <Text fontSize="lg" fontWeight="bold" color="blue.600">
                                89%
                              </Text>
                            </HStack>
                            
                            <HStack justify="space-between" p={3} bg="purple.50" borderRadius="md">
                              <VStack align="start" spacing={0}>
                                <Text fontSize="sm" fontWeight="semibold">
                                  Lunch Hour
                                </Text>
                                <Text fontSize="xs" color={textSecondary}>
                                  12:00 PM - 1:00 PM
                                </Text>
                              </VStack>
                              <Text fontSize="lg" fontWeight="bold" color="purple.600">
                                75%
                              </Text>
                            </HStack>
                            
                            <HStack justify="space-between" p={3} bg="green.50" borderRadius="md">
                              <VStack align="start" spacing={0}>
                                <Text fontSize="sm" fontWeight="semibold">
                                  Evening Commute
                                </Text>
                                <Text fontSize="xs" color={textSecondary}>
                                  5:00 PM - 7:00 PM
                                </Text>
                              </VStack>
                              <Text fontSize="lg" fontWeight="bold" color="green.600">
                                67%
                              </Text>
                            </HStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    </SimpleGrid>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </>
          )}
        </VStack>
      </Container>
    </Box>
  );
}