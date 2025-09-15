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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Icon,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid
} from '@chakra-ui/react';
import { ChevronRightIcon, WrenchScrewdriverIcon, ArrowLeftIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import { getAsset } from '@/lib/api/assets';

export default function AssetMaintenancePage() {
  const router = useRouter();
  const { assets } = router.query;
  const [assetData, setAssetData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textPrimary = useColorModeValue('gray.900', 'white');
  const textSecondary = useColorModeValue('gray.600', 'gray.300');

  useEffect(() => {
    if (!assets) return;

    const loadAssetData = async () => {
      try {
        setLoading(true);
        const assetIds = (assets as string).split(',').map(id => parseInt(id.trim()));
        const assetPromises = assetIds.map(id => getAsset(id));
        const results = await Promise.all(assetPromises);
        setAssetData(results);
      } catch (error: any) {
        console.error('Failed to load asset data:', error);
        toast({
          status: 'error',
          title: 'Failed to load asset data',
          description: error.message
        });
      } finally {
        setLoading(false);
      }
    };

    loadAssetData();
  }, [assets, toast]);

  const getAssetTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'fuel': return '⛽';
      case 'power': return '⚡';
      case 'network': return '🌐';
      case 'pos': return '💳';
      case 'hvac': return '🌡️';
      case 'security': return '🔒';
      case 'building': return '🏢';
      case 'dispenser': return '⛽';
      default: return '⚙️';
    }
  };

  const mockMaintenanceHistory = [
    {
      id: 1,
      date: '2025-09-10',
      type: 'Preventive',
      description: 'Quarterly filter replacement and system check',
      technician: 'John Smith',
      status: 'Completed',
      duration: '2 hours',
      cost: '$150.00'
    },
    {
      id: 2,
      date: '2025-08-15',
      type: 'Corrective',
      description: 'Replaced faulty sensor in display unit',
      technician: 'Jane Doe',
      status: 'Completed',
      duration: '1.5 hours',
      cost: '$275.00'
    },
    {
      id: 3,
      date: '2025-07-20',
      type: 'Preventive',
      description: 'Monthly calibration and software update',
      technician: 'Mike Johnson',
      status: 'Completed',
      duration: '45 minutes',
      cost: '$85.00'
    },
    {
      id: 4,
      date: '2025-09-25',
      type: 'Scheduled',
      description: 'Annual inspection and certification',
      technician: 'TBD',
      status: 'Scheduled',
      duration: '3 hours',
      cost: '$300.00'
    }
  ];

  const getMaintenanceTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'preventive': return 'green';
      case 'corrective': return 'orange';
      case 'scheduled': return 'blue';
      case 'emergency': return 'red';
      default: return 'gray';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'green';
      case 'in-progress': return 'yellow';
      case 'scheduled': return 'blue';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={4} align="center" justify="center" minH="400px">
          <Spinner size="xl" color="green.500" />
          <Text color={textSecondary}>Loading maintenance history...</Text>
        </VStack>
      </Container>
    );
  }

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
              <BreadcrumbItem isCurrentPage>
                <BreadcrumbLink>Maintenance History</BreadcrumbLink>
              </BreadcrumbItem>
            </Breadcrumb>
            
            <HStack justify="space-between" align="center" mt={4}>
              <Heading size="lg" color={textPrimary}>
                🔧 Maintenance History
              </Heading>
              <Button 
                leftIcon={<Icon as={ArrowLeftIcon} />} 
                variant="outline" 
                onClick={() => router.back()}
              >
                Back to Ticket
              </Button>
            </HStack>
            
            <Text color={textSecondary} mt={2}>
              View maintenance history and upcoming schedules for linked assets
            </Text>
          </Box>

          <Divider />

          {/* Maintenance Overview Stats */}
          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6}>
            <Stat>
              <StatLabel>Total Maintenance</StatLabel>
              <StatNumber color="blue.500">12</StatNumber>
              <StatHelpText>This year</StatHelpText>
            </Stat>
            <Stat>
              <StatLabel>Preventive</StatLabel>
              <StatNumber color="green.500">8</StatNumber>
              <StatHelpText>66% of total</StatHelpText>
            </Stat>
            <Stat>
              <StatLabel>Corrective</StatLabel>
              <StatNumber color="orange.500">3</StatNumber>
              <StatHelpText>25% of total</StatHelpText>
            </Stat>
            <Stat>
              <StatLabel>Next Scheduled</StatLabel>
              <StatNumber color="purple.500">6</StatNumber>
              <StatHelpText>days</StatHelpText>
            </Stat>
          </SimpleGrid>

          {/* Asset Maintenance */}
          {assetData.length === 0 ? (
            <Alert status="info">
              <AlertIcon />
              <AlertTitle>No assets found!</AlertTitle>
              <AlertDescription>
                The specified assets could not be loaded. Please check if the assets exist and try again.
              </AlertDescription>
            </Alert>
          ) : (
            <VStack spacing={6} align="stretch">
              {assetData.map((asset) => (
                <Card key={asset.asset_id} bg={cardBg} shadow="lg" borderColor={borderColor}>
                  <CardHeader bg="green.50" borderBottom="1px" borderColor={borderColor}>
                    <HStack spacing={3}>
                      <Text fontSize="2xl">{getAssetTypeIcon(asset.type)}</Text>
                      <Box flex={1}>
                        <Heading size="md" color="green.700">
                          Asset #{asset.asset_id} - {asset.type}
                        </Heading>
                        <Text fontSize="sm" color={textSecondary}>
                          {asset.model && `Model: ${asset.model} • `}
                          {asset.vendor_name && `Vendor: ${asset.vendor_name} • `}
                          {asset.location || 'Location not specified'}
                        </Text>
                      </Box>
                      <VStack align="end" spacing={1}>
                        <Badge colorScheme="green" size="lg" variant="solid">
                          {asset.status || 'operational'}
                        </Badge>
                        <HStack spacing={2}>
                          <Icon as={CalendarIcon} boxSize={4} color={textSecondary} />
                          <Text fontSize="xs" color={textSecondary}>
                            Last: Sep 10, 2025
                          </Text>
                        </HStack>
                      </VStack>
                    </HStack>
                  </CardHeader>

                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <HStack justify="space-between" align="center">
                        <Text fontSize="md" fontWeight="semibold" color={textPrimary}>
                          Maintenance History
                        </Text>
                        <Button size="sm" colorScheme="green" variant="outline">
                          Schedule Maintenance
                        </Button>
                      </HStack>
                      
                      <TableContainer>
                        <Table size="sm" variant="simple">
                          <Thead>
                            <Tr>
                              <Th>Date</Th>
                              <Th>Type</Th>
                              <Th>Description</Th>
                              <Th>Technician</Th>
                              <Th>Duration</Th>
                              <Th>Cost</Th>
                              <Th>Status</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {mockMaintenanceHistory.map((record) => (
                              <Tr key={record.id}>
                                <Td>
                                  <HStack spacing={2}>
                                    <Icon as={ClockIcon} boxSize={4} color={textSecondary} />
                                    <Text fontSize="sm">{record.date}</Text>
                                  </HStack>
                                </Td>
                                <Td>
                                  <Badge size="sm" colorScheme={getMaintenanceTypeColor(record.type)}>
                                    {record.type}
                                  </Badge>
                                </Td>
                                <Td>
                                  <Text fontSize="sm">{record.description}</Text>
                                </Td>
                                <Td>
                                  <Text fontSize="sm">{record.technician}</Text>
                                </Td>
                                <Td>
                                  <Text fontSize="sm">{record.duration}</Text>
                                </Td>
                                <Td>
                                  <Text fontSize="sm" fontWeight="semibold">{record.cost}</Text>
                                </Td>
                                <Td>
                                  <Badge size="sm" colorScheme={getStatusColor(record.status)}>
                                    {record.status}
                                  </Badge>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </TableContainer>

                      {mockMaintenanceHistory.length === 0 && (
                        <Alert status="info">
                          <AlertIcon />
                          <AlertTitle>No maintenance records</AlertTitle>
                          <AlertDescription>
                            No maintenance history is available for this asset yet.
                          </AlertDescription>
                        </Alert>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          )}
        </VStack>
      </Container>
    </Box>
  );
}