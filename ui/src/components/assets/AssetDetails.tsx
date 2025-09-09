import { FC } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
  Divider,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from '@chakra-ui/react';
import {
  ArrowLeftIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  MapPinIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { MotionBox } from '@/components/motion/MotionBox';

// Mock data for asset details
const assetDetails = {
  id: 'ASSET-001',
  name: 'Fuel Dispenser #1',
  type: 'fuel',
  status: 'operational',
  location: 'Hot Springs SD - Bay 1',
  site: 'Hot Springs SD',
  zone: 'Fuel Island A',
  manufacturer: 'Wayne',
  model: 'Helix 6000',
  serialNumber: 'WH6000-2024-001',
  installDate: '2024-01-15',
  warrantyExpires: '2026-01-15',
  lastMaintenance: '2024-08-15',
  nextMaintenance: '2024-11-15',
  uptime: 99.8,
  alerts: [],
  specifications: {
    fuelTypes: ['Regular', 'Premium', 'Diesel'],
    flowRate: '10 GPM',
    powerRequirement: '240V, 30A',
    communication: 'Ethernet',
    certifications: ['UL Listed', 'NFPA Compliant'],
  },
  maintenanceHistory: [
    {
      id: 'MAINT-001',
      date: '2024-08-15',
      type: 'Preventive',
      technician: 'John Smith',
      description: 'Quarterly maintenance - filter replacement, calibration check',
      status: 'completed',
      cost: 185.50,
    },
    {
      id: 'MAINT-002',
      date: '2024-05-15',
      type: 'Preventive',
      technician: 'Mike Johnson',
      description: 'Quarterly maintenance - pump inspection, software update',
      status: 'completed',
      cost: 165.00,
    },
    {
      id: 'MAINT-003',
      date: '2024-02-20',
      type: 'Corrective',
      technician: 'Sarah Wilson',
      description: 'Replaced faulty display unit',
      status: 'completed',
      cost: 425.75,
    },
  ],
  performanceMetrics: {
    dailyTransactions: 145,
    monthlyRevenue: 28500,
    errorRate: 0.2,
    avgTransactionTime: '2.3 minutes',
  },
};

const statusColors = {
  operational: 'green',
  warning: 'yellow',
  critical: 'red',
  maintenance: 'blue',
  offline: 'gray',
};

export const AssetDetails: FC = () => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <VStack spacing={6} align="stretch">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbLink href="/assets">Assets</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink>{assetDetails.name}</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      {/* Header */}
      <Flex justify="space-between" align="center">
        <HStack spacing={4}>
          <Button
            leftIcon={<ArrowLeftIcon className="w-4 h-4" />}
            variant="ghost"
            onClick={() => window.history.back()}
          >
            Back to Assets
          </Button>
          <Divider orientation="vertical" />
          <Box>
            <HStack spacing={3} mb={2}>
              <Text fontSize="2xl" fontWeight="bold">{assetDetails.name}</Text>
              <Badge colorScheme={statusColors[assetDetails.status as keyof typeof statusColors]} size="lg">
                {assetDetails.status.toUpperCase()}
              </Badge>
            </HStack>
            <HStack spacing={4} color="gray.500">
              <HStack>
                <MapPinIcon className="w-4 h-4" />
                <Text>{assetDetails.location}</Text>
              </HStack>
              <Text>•</Text>
              <Text>{assetDetails.id}</Text>
            </HStack>
          </Box>
        </HStack>
        
        <HStack spacing={3}>
          <Button leftIcon={<WrenchScrewdriverIcon className="w-4 h-4" />} colorScheme="blue">
            Schedule Maintenance
          </Button>
          <Button leftIcon={<Cog6ToothIcon className="w-4 h-4" />} variant="outline">
            Configure
          </Button>
        </HStack>
      </Flex>

      {/* Key Metrics */}
      <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={6}>
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Stat>
              <StatLabel>Uptime</StatLabel>
              <StatNumber color="green.500">{assetDetails.uptime}%</StatNumber>
              <StatHelpText>Last 30 days</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Stat>
              <StatLabel>Daily Transactions</StatLabel>
              <StatNumber color="blue.500">{assetDetails.performanceMetrics.dailyTransactions}</StatNumber>
              <StatHelpText>Average per day</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Stat>
              <StatLabel>Monthly Revenue</StatLabel>
              <StatNumber color="purple.500">${assetDetails.performanceMetrics.monthlyRevenue.toLocaleString()}</StatNumber>
              <StatHelpText>Current month</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Stat>
              <StatLabel>Error Rate</StatLabel>
              <StatNumber color="orange.500">{assetDetails.performanceMetrics.errorRate}%</StatNumber>
              <StatHelpText>Transaction failures</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </Grid>

      {/* Detailed Information Tabs */}
      <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <CardBody>
          <Tabs variant="enclosed">
            <TabList>
              <Tab>Overview</Tab>
              <Tab>Maintenance</Tab>
              <Tab>Performance</Tab>
              <Tab>Alerts</Tab>
              <Tab>Documentation</Tab>
            </TabList>

            <TabPanels>
              {/* Overview Tab */}
              <TabPanel>
                <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={8}>
                  <VStack align="stretch" spacing={6}>
                    <Box>
                      <Text fontSize="lg" fontWeight="semibold" mb={3}>Asset Information</Text>
                      <VStack align="stretch" spacing={3}>
                        <HStack justify="space-between">
                          <Text color="gray.500">Type</Text>
                          <Text>Fuel System</Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text color="gray.500">Manufacturer</Text>
                          <Text>{assetDetails.manufacturer}</Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text color="gray.500">Model</Text>
                          <Text>{assetDetails.model}</Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text color="gray.500">Serial Number</Text>
                          <Text>{assetDetails.serialNumber}</Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text color="gray.500">Install Date</Text>
                          <Text>{new Date(assetDetails.installDate).toLocaleDateString()}</Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text color="gray.500">Warranty Expires</Text>
                          <Text>{new Date(assetDetails.warrantyExpires).toLocaleDateString()}</Text>
                        </HStack>
                      </VStack>
                    </Box>
                  </VStack>

                  <VStack align="stretch" spacing={6}>
                    <Box>
                      <Text fontSize="lg" fontWeight="semibold" mb={3}>Specifications</Text>
                      <VStack align="stretch" spacing={3}>
                        <HStack justify="space-between">
                          <Text color="gray.500">Fuel Types</Text>
                          <Text>{assetDetails.specifications.fuelTypes.join(', ')}</Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text color="gray.500">Flow Rate</Text>
                          <Text>{assetDetails.specifications.flowRate}</Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text color="gray.500">Power</Text>
                          <Text>{assetDetails.specifications.powerRequirement}</Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text color="gray.500">Communication</Text>
                          <Text>{assetDetails.specifications.communication}</Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text color="gray.500">Certifications</Text>
                          <VStack align="end" spacing={1}>
                            {assetDetails.specifications.certifications.map((cert, index) => (
                              <Badge key={index} variant="subtle" colorScheme="green">{cert}</Badge>
                            ))}
                          </VStack>
                        </HStack>
                      </VStack>
                    </Box>
                  </VStack>
                </Grid>
              </TabPanel>

              {/* Maintenance Tab */}
              <TabPanel>
                <VStack align="stretch" spacing={6}>
                  <HStack justify="space-between">
                    <Text fontSize="lg" fontWeight="semibold">Maintenance Schedule</Text>
                    <Button leftIcon={<CalendarIcon className="w-4 h-4" />} size="sm">
                      Schedule Maintenance
                    </Button>
                  </HStack>
                  
                  <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
                    <Card variant="outline">
                      <CardBody>
                        <VStack spacing={3}>
                          <ClockIcon className="w-8 h-8 text-blue-500" />
                          <Text fontWeight="semibold">Last Maintenance</Text>
                          <Text fontSize="lg">{new Date(assetDetails.lastMaintenance).toLocaleDateString()}</Text>
                          <Text fontSize="sm" color="gray.500">Preventive maintenance completed</Text>
                        </VStack>
                      </CardBody>
                    </Card>
                    
                    <Card variant="outline">
                      <CardBody>
                        <VStack spacing={3}>
                          <CalendarIcon className="w-8 h-8 text-green-500" />
                          <Text fontWeight="semibold">Next Maintenance</Text>
                          <Text fontSize="lg">{new Date(assetDetails.nextMaintenance).toLocaleDateString()}</Text>
                          <Text fontSize="sm" color="gray.500">Scheduled in 45 days</Text>
                        </VStack>
                      </CardBody>
                    </Card>
                  </Grid>

                  <Box>
                    <Text fontSize="lg" fontWeight="semibold" mb={4}>Maintenance History</Text>
                    <Table variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Date</Th>
                          <Th>Type</Th>
                          <Th>Technician</Th>
                          <Th>Description</Th>
                          <Th>Cost</Th>
                          <Th>Status</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {assetDetails.maintenanceHistory.map((record) => (
                          <Tr key={record.id}>
                            <Td>{new Date(record.date).toLocaleDateString()}</Td>
                            <Td>
                              <Badge colorScheme={record.type === 'Preventive' ? 'blue' : 'orange'}>
                                {record.type}
                              </Badge>
                            </Td>
                            <Td>{record.technician}</Td>
                            <Td>{record.description}</Td>
                            <Td>${record.cost.toFixed(2)}</Td>
                            <Td>
                              <Badge colorScheme="green">Completed</Badge>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                </VStack>
              </TabPanel>

              {/* Performance Tab */}
              <TabPanel>
                <Text fontSize="lg" fontWeight="semibold" mb={4}>Performance Metrics</Text>
                <Text color="gray.500">Performance charts and detailed analytics would be displayed here.</Text>
              </TabPanel>

              {/* Alerts Tab */}
              <TabPanel>
                <VStack align="stretch" spacing={4}>
                  <Text fontSize="lg" fontWeight="semibold">Active Alerts</Text>
                  {assetDetails.alerts.length === 0 ? (
                    <Alert status="success">
                      <AlertIcon />
                      <AlertTitle>No active alerts!</AlertTitle>
                      <AlertDescription>This asset is operating normally.</AlertDescription>
                    </Alert>
                  ) : (
                    assetDetails.alerts.map((alert: any) => (
                      <Alert key={alert.id} status="warning">
                        <AlertIcon />
                        <AlertTitle>{alert.title}</AlertTitle>
                        <AlertDescription>{alert.description}</AlertDescription>
                      </Alert>
                    ))
                  )}
                </VStack>
              </TabPanel>

              {/* Documentation Tab */}
              <TabPanel>
                <VStack align="stretch" spacing={4}>
                  <Text fontSize="lg" fontWeight="semibold">Documentation</Text>
                  <Text color="gray.500">User manuals, installation guides, and other documentation would be available here.</Text>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </CardBody>
      </Card>
    </VStack>
  );
};
