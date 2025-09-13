import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Card,
  CardBody,
  CardHeader,
  Grid,
  GridItem,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Spinner,
  Alert,
  AlertIcon,
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
  IconButton,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import {
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  CubeIcon,
  EyeIcon,
  PencilIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import { Vendor, VendorAsset, getVendors, getVendorAssets } from '../../lib/api/vendors';
import { Asset, getAsset, updateAsset } from '../../lib/api/assets';

const VendorManagementPage: React.FC = () => {
  const router = useRouter();
  const toast = useToast();
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const bgColor = useColorModeValue('white', 'gray.800');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  // State
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorAssets, setVendorAssets] = useState<Record<number, VendorAsset[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingAssets, setLoadingAssets] = useState<Record<number, boolean>>({});

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [linkAssetId, setLinkAssetId] = useState<string>('');
  const [linkPreview, setLinkPreview] = useState<Asset | null>(null);
  const [linkLoading, setLinkLoading] = useState<boolean>(false);
  const [detachLoading, setDetachLoading] = useState<Record<number, boolean>>({});

  const loadVendors = useCallback(async () => {
    try {
      setLoading(true);
      const vendorData = await getVendors();
      setVendors(vendorData);
    } catch (error) {
      console.error('Failed to load vendors:', error);
      toast({
        title: 'Error',
        description: 'Failed to load vendors',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const loadVendorAssets = async (vendorId: number) => {
    if (vendorAssets[vendorId]) return; // Already loaded

    try {
      setLoadingAssets(prev => ({ ...prev, [vendorId]: true }));
      const assets = await getVendorAssets(vendorId);
      setVendorAssets(prev => ({ ...prev, [vendorId]: assets }));
    } catch (error) {
      console.error('Failed to load vendor assets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load vendor assets',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoadingAssets(prev => ({ ...prev, [vendorId]: false }));
    }
  };

  const handleViewVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    loadVendorAssets(vendor.vendor_id);
    setLinkPreview(null);
    setLinkAssetId('');
  };

  const handleViewAsset = (assetId: number) => {
    router.push(`/assets/${assetId}`);
  };

  // Filter vendors
  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || vendor.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = Array.from(new Set(vendors.map(v => v.category))).sort();

  // Stats
  const totalVendors = vendors.length;
  const totalAssets = Object.values(vendorAssets).reduce((sum, assets) => sum + assets.length, 0);
  const categoriesCount = categories.length;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box maxW="7xl" mx="auto" p={6}>
      {/* Header */}
      <VStack align="start" spacing={4} mb={6}>
        <HStack justifyContent="space-between" w="full">
          <Text fontSize="3xl" fontWeight="bold">
            Vendor Management
          </Text>
          <Button leftIcon={<DocumentTextIcon className="w-4 h-4" />} colorScheme="blue">
            Export Report
          </Button>
        </HStack>

        {/* Stats */}
        <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4} w="full">
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Vendors</StatLabel>
                <StatNumber>{totalVendors}</StatNumber>
                <StatHelpText>Active vendors</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Categories</StatLabel>
                <StatNumber>{categoriesCount}</StatNumber>
                <StatHelpText>Vendor categories</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Assets</StatLabel>
                <StatNumber>{totalAssets}</StatNumber>
                <StatHelpText>Assets tracked</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </Grid>
      </VStack>

      <Tabs>
        <TabList>
          <Tab>Vendor List</Tab>
          {selectedVendor && <Tab>Vendor Details</Tab>}
        </TabList>

        <TabPanels>
          {/* Vendor List Tab */}
          <TabPanel px={0}>
            {/* Filters */}
            <HStack spacing={4} mb={6}>
              <InputGroup maxW="300px">
                <InputLeftElement>
                  <MagnifyingGlassIcon className="w-4 h-4" />
                </InputLeftElement>
                <Input
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
              <Select
                placeholder="All Categories"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                maxW="200px"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
              <Text fontSize="sm" color="gray.500">
                {filteredVendors.length} of {totalVendors} vendors
              </Text>
            </HStack>

            {/* Vendor Cards */}
            <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={4}>
              {filteredVendors.map(vendor => (
                <Card
                  key={vendor.vendor_id}
                  cursor="pointer"
                  _hover={{ bg: hoverBg, transform: 'translateY(-2px)' }}
                  transition="all 0.2s"
                  onClick={() => handleViewVendor(vendor)}
                >
                  <CardHeader pb={2}>
                    <HStack justifyContent="space-between">
                      <VStack align="start" spacing={1}>
                        <Text fontSize="lg" fontWeight="semibold">
                          {vendor.name}
                        </Text>
                        <Badge colorScheme="blue">{vendor.category}</Badge>
                      </VStack>
                      <VStack align="end" spacing={1}>
                        <Text fontSize="sm" color="gray.500">
                          ID: {vendor.vendor_id}
                        </Text>
                        <IconButton
                          aria-label="View vendor"
                          icon={<EyeIcon className="w-4 h-4" />}
                          size="sm"
                          variant="ghost"
                        />
                      </VStack>
                    </HStack>
                  </CardHeader>
                  <CardBody pt={0}>
                    <HStack justify="space-between">
                      <HStack spacing={4}>
                        <HStack>
                          <CubeIcon className="w-4 h-4" />
                          <Text fontSize="sm">
                            {vendorAssets[vendor.vendor_id]?.length || 0} assets
                          </Text>
                        </HStack>
                      </HStack>
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<BuildingOfficeIcon className="w-3 h-3" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          loadVendorAssets(vendor.vendor_id);
                        }}
                        isLoading={loadingAssets[vendor.vendor_id]}
                      >
                        Load Assets
                      </Button>
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </Grid>

            {filteredVendors.length === 0 && (
              <Alert status="info" mt={4}>
                <AlertIcon />
                No vendors found matching your criteria.
              </Alert>
            )}
          </TabPanel>

          {/* Vendor Details Tab */}
          {selectedVendor && (
            <TabPanel px={0}>
              <VStack align="start" spacing={6}>
                {/* Vendor Info */}
                <Card w="full">
                  <CardHeader>
                    <HStack justifyContent="space-between">
                      <VStack align="start" spacing={1}>
                        <Text fontSize="xl" fontWeight="bold">
                          {selectedVendor.name}
                        </Text>
                        <HStack>
                          <Badge colorScheme="blue">{selectedVendor.category}</Badge>
                          <Badge variant="outline">ID: {selectedVendor.vendor_id}</Badge>
                        </HStack>
                      </VStack>
                      <Button
                        leftIcon={<PencilIcon className="w-4 h-4" />}
                        variant="outline"
                        size="sm"
                      >
                        Edit Vendor
                      </Button>
                    </HStack>
                  </CardHeader>
                </Card>

                {/* Link Asset to Vendor */}
                <Card w="full">
                  <CardHeader>
                    <HStack justifyContent="space-between">
                      <Text fontSize="lg" fontWeight="semibold">Attach Asset to {selectedVendor.name}</Text>
                    </HStack>
                  </CardHeader>
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      <HStack>
                        <Input
                          placeholder="Enter Asset ID"
                          value={linkAssetId}
                          onChange={(e) => setLinkAssetId(e.target.value)}
                          maxW="200px"
                        />
                        <Button
                          onClick={async () => {
                            const id = Number(linkAssetId);
                            if (!id) return;
                            try {
                              setLinkLoading(true);
                              const a = await getAsset(id);
                              setLinkPreview(a);
                            } catch (err) {
                              setLinkPreview(null);
                              toast({ title: 'Asset not found', status: 'error' });
                            } finally {
                              setLinkLoading(false);
                            }
                          }}
                          isLoading={linkLoading}
                        >
                          Preview
                        </Button>
                        <Button
                          colorScheme="blue"
                          onClick={async () => {
                            if (!linkPreview) return;
                            try {
                              setLinkLoading(true);
                              await updateAsset({
                                asset_id: linkPreview.asset_id,
                                site_id: linkPreview.site_id,
                                zone_id: linkPreview.zone_id,
                                type: linkPreview.type,
                                model: linkPreview.model ?? undefined,
                                vendor_id: selectedVendor.vendor_id,
                                serial: linkPreview.serial ?? undefined,
                                location: linkPreview.location ?? undefined,
                                purchase_date: linkPreview.purchase_date ?? undefined,
                                warranty_until: linkPreview.warranty_until ?? undefined,
                              });
                              toast({ title: 'Asset attached to vendor', status: 'success' });
                              setLinkPreview(null);
                              setLinkAssetId('');
                              await loadVendorAssets(selectedVendor.vendor_id);
                            } catch (err) {
                              toast({ title: 'Failed to attach asset', status: 'error' });
                            } finally {
                              setLinkLoading(false);
                            }
                          }}
                          isDisabled={!linkPreview}
                          isLoading={linkLoading}
                        >
                          Attach
                        </Button>
                      </HStack>
                      {linkPreview && (
                        <Box borderWidth="1px" borderRadius="md" p={3}>
                          <HStack justify="space-between">
                            <VStack align="start" spacing={0}>
                              <Text fontWeight="semibold">Asset #{linkPreview.asset_id}</Text>
                              <Text fontSize="sm" color="gray.500">{linkPreview.type} · {linkPreview.model || '—'} · Serial {linkPreview.serial || '—'}</Text>
                              <Text fontSize="sm" color="gray.500">Site {linkPreview.site_id} · {linkPreview.location || '—'}</Text>
                            </VStack>
                            <Badge>{linkPreview.vendor_name ? `Current Vendor: ${linkPreview.vendor_name}` : 'No vendor assigned'}</Badge>
                          </HStack>
                        </Box>
                      )}
                    </VStack>
                  </CardBody>
                </Card>

                {/* Assets Table */}
                <Card w="full">
                  <CardHeader>
                    <HStack justifyContent="space-between">
                      <Text fontSize="lg" fontWeight="semibold">
                        Associated Assets ({vendorAssets[selectedVendor.vendor_id]?.length || 0})
                      </Text>
                      <Button
                        size="sm"
                        onClick={() => loadVendorAssets(selectedVendor.vendor_id)}
                        isLoading={loadingAssets[selectedVendor.vendor_id]}
                      >
                        Refresh
                      </Button>
                    </HStack>
                  </CardHeader>
                  <CardBody>
                    {loadingAssets[selectedVendor.vendor_id] ? (
                      <Box textAlign="center" py={8}>
                        <Spinner />
                      </Box>
                    ) : vendorAssets[selectedVendor.vendor_id]?.length > 0 ? (
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Asset ID</Th>
                            <Th>Type</Th>
                            <Th>Model</Th>
                            <Th>Serial</Th>
                            <Th>Site</Th>
                            <Th>Location</Th>
                            <Th>Warranty</Th>
                            <Th>Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {vendorAssets[selectedVendor.vendor_id].map(asset => (
                            <Tr key={asset.asset_id} _hover={{ bg: hoverBg }}>
                              <Td fontWeight="medium">{asset.asset_id}</Td>
                              <Td>{asset.type}</Td>
                              <Td>{asset.model || 'N/A'}</Td>
                              <Td>{asset.serial || 'N/A'}</Td>
                              <Td>{asset.site_name || `Site ${asset.site_id}`}</Td>
                              <Td>{asset.location || 'N/A'}</Td>
                              <Td>
                                {asset.warranty_until ? (
                                  <Badge 
                                    colorScheme={
                                      new Date(asset.warranty_until) > new Date() ? 'green' : 'red'
                                    }
                                  >
                                    {new Date(asset.warranty_until).toLocaleDateString()}
                                  </Badge>
                                ) : (
                                  'N/A'
                                )}
                              </Td>
                              <Td>
                                <Tooltip label="View Asset">
                                  <IconButton
                                    aria-label="View asset"
                                    icon={<EyeIcon className="w-4 h-4" />}
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleViewAsset(asset.asset_id)}
                                  />
                                </Tooltip>
                                <Button
                                  size="xs"
                                  ml={2}
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      setDetachLoading(prev => ({ ...prev, [asset.asset_id]: true }));
                                      const a = await getAsset(asset.asset_id);
                                      await updateAsset({
                                        asset_id: a.asset_id,
                                        site_id: a.site_id,
                                        zone_id: a.zone_id,
                                        type: a.type,
                                        model: a.model ?? undefined,
                                        vendor_id: null,
                                        serial: a.serial ?? undefined,
                                        location: a.location ?? undefined,
                                        purchase_date: a.purchase_date ?? undefined,
                                        warranty_until: a.warranty_until ?? undefined,
                                      });
                                      toast({ title: 'Asset detached from vendor', status: 'success' });
                                      await loadVendorAssets(selectedVendor.vendor_id);
                                    } catch (err) {
                                      toast({ title: 'Failed to detach asset', status: 'error' });
                                    } finally {
                                      setDetachLoading(prev => ({ ...prev, [asset.asset_id]: false }));
                                    }
                                  }}
                                  isLoading={detachLoading[asset.asset_id]}
                                >
                                  Detach
                                </Button>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    ) : (
                      <Alert status="info">
                        <AlertIcon />
                        No assets found for this vendor.
                      </Alert>
                    )}
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default VendorManagementPage;
