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
  SimpleGrid,
  Icon,
  Divider
} from '@chakra-ui/react';
import { ChevronRightIcon, DocumentTextIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { getAsset } from '@/lib/api/assets';

export default function AssetManualsPage() {
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

  const mockManuals = [
    { name: 'Installation Guide', type: 'PDF', size: '2.4 MB', url: '#' },
    { name: 'Operation Manual', type: 'PDF', size: '5.1 MB', url: '#' },
    { name: 'Maintenance Procedures', type: 'PDF', size: '1.8 MB', url: '#' },
    { name: 'Troubleshooting Guide', type: 'PDF', size: '3.2 MB', url: '#' },
    { name: 'Parts Catalog', type: 'PDF', size: '4.7 MB', url: '#' },
    { name: 'Safety Guidelines', type: 'PDF', size: '1.2 MB', url: '#' }
  ];

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={4} align="center" justify="center" minH="400px">
          <Spinner size="xl" color="blue.500" />
          <Text color={textSecondary}>Loading asset manuals...</Text>
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
                <BreadcrumbLink>Asset Manuals</BreadcrumbLink>
              </BreadcrumbItem>
            </Breadcrumb>
            
            <HStack justify="space-between" align="center" mt={4}>
              <Heading size="lg" color={textPrimary}>
                📚 Asset Manuals & Documentation
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
              View and download manuals and documentation for linked assets
            </Text>
          </Box>

          <Divider />

          {/* Asset Documentation */}
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
                  <CardHeader bg="blue.50" borderBottom="1px" borderColor={borderColor}>
                    <HStack spacing={3}>
                      <Text fontSize="2xl">{getAssetTypeIcon(asset.type)}</Text>
                      <Box flex={1}>
                        <Heading size="md" color="blue.700">
                          Asset #{asset.asset_id} - {asset.type}
                        </Heading>
                        <Text fontSize="sm" color={textSecondary}>
                          {asset.model && `Model: ${asset.model} • `}
                          {asset.vendor_name && `Vendor: ${asset.vendor_name} • `}
                          {asset.location || 'Location not specified'}
                        </Text>
                      </Box>
                      <Badge colorScheme="blue" size="lg" variant="solid">
                        {asset.status || 'operational'}
                      </Badge>
                    </HStack>
                  </CardHeader>

                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <Text fontSize="md" fontWeight="semibold" color={textPrimary}>
                        Available Documentation
                      </Text>
                      
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                        {mockManuals.map((manual, index) => (
                          <Card key={index} variant="outline" cursor="pointer" _hover={{ shadow: 'md', borderColor: 'blue.300' }}>
                            <CardBody p={4}>
                              <VStack spacing={3} align="center">
                                <Icon as={DocumentTextIcon} boxSize={8} color="blue.500" />
                                <VStack spacing={1} align="center">
                                  <Text fontSize="sm" fontWeight="semibold" textAlign="center" color={textPrimary}>
                                    {manual.name}
                                  </Text>
                                  <HStack spacing={2}>
                                    <Badge size="sm" colorScheme="gray">{manual.type}</Badge>
                                    <Badge size="sm" colorScheme="blue">{manual.size}</Badge>
                                  </HStack>
                                </VStack>
                                <Button size="sm" colorScheme="blue" variant="outline" w="full">
                                  Download
                                </Button>
                              </VStack>
                            </CardBody>
                          </Card>
                        ))}
                      </SimpleGrid>

                      {mockManuals.length === 0 && (
                        <Alert status="warning">
                          <AlertIcon />
                          <AlertTitle>No documentation available</AlertTitle>
                          <AlertDescription>
                            No manuals or documentation files have been uploaded for this asset yet.
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