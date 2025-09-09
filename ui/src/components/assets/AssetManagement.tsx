import { FC, useState } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Badge,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardBody,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
  Divider,
  Avatar,
  Progress,
  Tooltip,
} from '@chakra-ui/react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  MapPinIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  BoltIcon,
  SignalIcon,
  HomeIcon,
  ShieldCheckIcon,
  ComputerDesktopIcon,
  FireIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import { MotionBox } from '@/components/motion/MotionBox';

// Asset type definitions based on your domain packs
const assetTypes = {
  fuel: { icon: FireIcon, label: 'Fuel Systems', color: 'orange' },
  power: { icon: BoltIcon, label: 'Power Systems', color: 'yellow' },
  network: { icon: SignalIcon, label: 'Network Equipment', color: 'blue' },
  pos: { icon: ComputerDesktopIcon, label: 'POS Systems', color: 'green' },
  hvac: { icon: HomeIcon, label: 'HVAC Systems', color: 'teal' },
  security: { icon: ShieldCheckIcon, label: 'Security Systems', color: 'purple' },
  building: { icon: HomeIcon, label: 'Building Systems', color: 'gray' },
  endpoint: { icon: ComputerDesktopIcon, label: 'Endpoint Devices', color: 'cyan' },
};

const statusColors = {
  operational: 'green',
  warning: 'yellow',
  critical: 'red',
  maintenance: 'blue',
  offline: 'gray',
};

// Mock data - in real app this would come from your API
const mockAssets = [
  {
    id: 'ASSET-001',
    name: 'Fuel Dispenser #1',
    type: 'fuel',
    status: 'operational',
    location: 'Hot Springs SD - Bay 1',
    site: 'Hot Springs SD',
    zone: 'Fuel Island A',
    lastMaintenance: '2024-08-15',
    nextMaintenance: '2024-11-15',
    alerts: 0,
    uptime: 99.8,
  },
  {
    id: 'ASSET-002',
    name: 'POS Terminal #3',
    type: 'pos',
    status: 'warning',
    location: 'Hot Springs SD - Counter 3',
    site: 'Hot Springs SD',
    zone: 'Sales Floor',
    lastMaintenance: '2024-07-20',
    nextMaintenance: '2024-10-20',
    alerts: 2,
    uptime: 95.2,
  },
  {
    id: 'ASSET-003',
    name: 'Network Switch #1',
    type: 'network',
    status: 'operational',
    location: 'Hot Springs SD - Server Room',
    site: 'Hot Springs SD',
    zone: 'IT Infrastructure',
    lastMaintenance: '2024-09-01',
    nextMaintenance: '2024-12-01',
    alerts: 0,
    uptime: 99.9,
  },
  {
    id: 'ASSET-004',
    name: 'HVAC Unit #2',
    type: 'hvac',
    status: 'critical',
    location: 'Hot Springs SD - Roof',
    site: 'Hot Springs SD',
    zone: 'HVAC Zone B',
    lastMaintenance: '2024-06-10',
    nextMaintenance: '2024-09-10',
    alerts: 5,
    uptime: 78.5,
  },
  {
    id: 'ASSET-005',
    name: 'Security Camera #7',
    type: 'security',
    status: 'operational',
    location: 'Hot Springs SD - Parking Lot',
    site: 'Hot Springs SD',
    zone: 'Perimeter',
    lastMaintenance: '2024-08-30',
    nextMaintenance: '2024-11-30',
    alerts: 0,
    uptime: 97.8,
  },
  {
    id: 'ASSET-006',
    name: 'UPS Battery System',
    type: 'power',
    status: 'maintenance',
    location: 'Hot Springs SD - Electrical Room',
    site: 'Hot Springs SD',
    zone: 'Power Distribution',
    lastMaintenance: '2024-09-05',
    nextMaintenance: '2024-12-05',
    alerts: 1,
    uptime: 92.3,
  },
];

const AssetCard: FC<{ asset: any }> = ({ asset }) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const typeConfig = assetTypes[asset.type as keyof typeof assetTypes];
  const IconComponent = typeConfig.icon;

  return (
    <MotionBox
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        bg={cardBg}
        borderColor={borderColor}
        borderWidth="1px"
        _hover={{ shadow: 'lg' }}
        transition="all 0.2s"
      >
        <CardBody>
          <Flex justify="space-between" align="start" mb={4}>
            <HStack spacing={3}>
              <Box
                p={2}
                borderRadius="lg"
                bg={`${typeConfig.color}.100`}
                _dark={{ bg: `${typeConfig.color}.900` }}
              >
                <IconComponent className="w-5 h-5" color={`var(--chakra-colors-${typeConfig.color}-500)`} />
              </Box>
              <Box>
                <Text fontWeight="bold" fontSize="lg">{asset.name}</Text>
                <Text fontSize="sm" color="gray.500">{asset.id}</Text>
              </Box>
            </HStack>
            
            <Menu>
              <MenuButton
                as={IconButton}
                icon={<EllipsisVerticalIcon className="w-4 h-4" />}
                variant="ghost"
                size="sm"
              />
              <MenuList>
                <MenuItem>View Details</MenuItem>
                <MenuItem>Edit Asset</MenuItem>
                <MenuItem>Maintenance History</MenuItem>
                <MenuItem>Create Alert</MenuItem>
                <Divider />
                <MenuItem color="red.500">Decommission</MenuItem>
              </MenuList>
            </Menu>
          </Flex>

          <VStack align="stretch" spacing={3}>
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.500">Status</Text>
              <Badge colorScheme={statusColors[asset.status as keyof typeof statusColors]}>
                {asset.status.toUpperCase()}
              </Badge>
            </HStack>

            <HStack justify="space-between">
              <HStack>
                <MapPinIcon className="w-4 h-4" />
                <Text fontSize="sm">{asset.location}</Text>
              </HStack>
            </HStack>

            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.500">Uptime</Text>
              <HStack>
                <Progress 
                  value={asset.uptime} 
                  size="sm" 
                  width="60px"
                  colorScheme={asset.uptime > 95 ? 'green' : asset.uptime > 85 ? 'yellow' : 'red'}
                />
                <Text fontSize="sm" fontWeight="medium">{asset.uptime}%</Text>
              </HStack>
            </HStack>

            {asset.alerts > 0 && (
              <HStack justify="space-between">
                <HStack>
                  <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
                  <Text fontSize="sm" color="yellow.500">Active Alerts</Text>
                </HStack>
                <Badge colorScheme="yellow">{asset.alerts}</Badge>
              </HStack>
            )}

            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.500">Next Maintenance</Text>
              <Text fontSize="sm">{new Date(asset.nextMaintenance).toLocaleDateString()}</Text>
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    </MotionBox>
  );
};

export const AssetManagement: FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSite, setSelectedSite] = useState('all');

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Filter assets based on search and filters
  const filteredAssets = mockAssets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || asset.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || asset.status === selectedStatus;
    const matchesSite = selectedSite === 'all' || asset.site === selectedSite;
    
    return matchesSearch && matchesType && matchesStatus && matchesSite;
  });

  // Calculate summary stats
  const totalAssets = mockAssets.length;
  const operationalAssets = mockAssets.filter(a => a.status === 'operational').length;
  const criticalAssets = mockAssets.filter(a => a.status === 'critical').length;
  const maintenanceAssets = mockAssets.filter(a => a.status === 'maintenance').length;
  const avgUptime = mockAssets.reduce((sum, asset) => sum + asset.uptime, 0) / totalAssets;

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <Flex justify="space-between" align="center">
        <Box>
          <Text fontSize="3xl" fontWeight="800" bgGradient="linear(to-r, brand.400, purple.500)" bgClip="text">
            Asset Management
          </Text>
          <Text color="gray.500" mt={1}>
            Monitor and manage your infrastructure assets across all sites
          </Text>
        </Box>
        <Button
          leftIcon={<PlusIcon className="w-4 h-4" />}
          colorScheme="brand"
          size="lg"
        >
          Add Asset
        </Button>
      </Flex>

      {/* Summary Stats */}
      <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={6}>
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Stat>
              <StatLabel>Total Assets</StatLabel>
              <StatNumber color="blue.500">{totalAssets}</StatNumber>
              <StatHelpText>Across all sites</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Stat>
              <StatLabel>Operational</StatLabel>
              <StatNumber color="green.500">{operationalAssets}</StatNumber>
              <StatHelpText>{((operationalAssets / totalAssets) * 100).toFixed(1)}% of total</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Stat>
              <StatLabel>Critical Issues</StatLabel>
              <StatNumber color="red.500">{criticalAssets}</StatNumber>
              <StatHelpText>Require immediate attention</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Stat>
              <StatLabel>Average Uptime</StatLabel>
              <StatNumber color="purple.500">{avgUptime.toFixed(1)}%</StatNumber>
              <StatHelpText>Last 30 days</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </Grid>

      {/* Filters and Search */}
      <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <CardBody>
          <Flex direction={{ base: 'column', md: 'row' }} gap={4} align={{ md: 'center' }}>
            <InputGroup maxW="400px">
              <InputLeftElement>
                <MagnifyingGlassIcon className="w-4 h-4" />
              </InputLeftElement>
              <Input
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
            
            <HStack spacing={4} flex={1}>
              <Select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} maxW="200px">
                <option value="all">All Types</option>
                {Object.entries(assetTypes).map(([key, type]) => (
                  <option key={key} value={key}>{type.label}</option>
                ))}
              </Select>
              
              <Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} maxW="200px">
                <option value="all">All Statuses</option>
                <option value="operational">Operational</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
                <option value="maintenance">Maintenance</option>
                <option value="offline">Offline</option>
              </Select>
              
              <Select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)} maxW="200px">
                <option value="all">All Sites</option>
                <option value="Hot Springs SD">Hot Springs SD</option>
                <option value="Pierre SD">Pierre SD</option>
                <option value="Rapid City SD">Rapid City SD</option>
              </Select>
            </HStack>
            
            <IconButton
              icon={<FunnelIcon className="w-4 h-4" />}
              aria-label="Advanced filters"
              variant="outline"
            />
          </Flex>
        </CardBody>
      </Card>

      {/* Asset Grid */}
      <Grid templateColumns="repeat(auto-fill, minmax(400px, 1fr))" gap={6}>
        {filteredAssets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </Grid>

      {filteredAssets.length === 0 && (
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody py={12}>
            <VStack spacing={4}>
              <CubeIcon className="w-12 h-12 text-gray-400" />
              <Text fontSize="lg" color="gray.500">No assets found</Text>
              <Text color="gray.400">Try adjusting your search or filters</Text>
            </VStack>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
};
