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
  Input,
  InputGroup,
  InputLeftElement,
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
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon
} from '@chakra-ui/react';
import { 
  ChevronRightIcon, 
  ArrowLeftIcon, 
  MagnifyingGlassIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';

export default function KnowledgeBasePage() {
  const router = useRouter();
  const { category, q } = router.query;
  const [searchTerm, setSearchTerm] = useState((q as string) || '');
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState((category as string) || 'all');
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textPrimary = useColorModeValue('gray.900', 'white');
  const textSecondary = useColorModeValue('gray.600', 'gray.300');

  const mockKnowledgeArticles = [
    {
      id: 1,
      title: 'Fuel Dispenser Error Codes and Troubleshooting',
      category: 'Fuel Systems',
      description: 'Complete guide to diagnosing and resolving common fuel dispenser error codes',
      tags: ['troubleshooting', 'fuel', 'dispenser', 'errors'],
      lastUpdated: '2025-09-01',
      views: 245,
      helpful: 18
    },
    {
      id: 2,
      title: 'Network Configuration for POS Systems',
      category: 'Network',
      description: 'Step-by-step guide for configuring network settings on point-of-sale systems',
      tags: ['network', 'pos', 'configuration', 'setup'],
      lastUpdated: '2025-08-28',
      views: 189,
      helpful: 23
    },
    {
      id: 3,
      title: 'HVAC System Preventive Maintenance Schedule',
      category: 'HVAC',
      description: 'Monthly and quarterly maintenance tasks for optimal HVAC performance',
      tags: ['hvac', 'maintenance', 'preventive', 'schedule'],
      lastUpdated: '2025-09-05',
      views: 156,
      helpful: 31
    },
    {
      id: 4,
      title: 'Security System Camera Alignment and Focus',
      category: 'Security',
      description: 'How to properly align and focus security cameras for optimal coverage',
      tags: ['security', 'cameras', 'installation', 'setup'],
      lastUpdated: '2025-08-20',
      views: 134,
      helpful: 15
    },
    {
      id: 5,
      title: 'Power Management and UPS Configuration',
      category: 'Power Systems',
      description: 'Best practices for configuring uninterruptible power supplies',
      tags: ['power', 'ups', 'configuration', 'backup'],
      lastUpdated: '2025-09-12',
      views: 98,
      helpful: 12
    }
  ];

  const mockFAQs = [
    {
      question: 'How often should fuel dispensers be calibrated?',
      answer: 'Fuel dispensers should be calibrated quarterly or as required by local regulations. Check your local jurisdiction for specific requirements.',
      category: 'Fuel Systems'
    },
    {
      question: 'What is the recommended temperature range for server rooms?',
      answer: 'Server rooms should be maintained between 68-72°F (20-22°C) with humidity levels between 45-55% for optimal equipment performance.',
      category: 'HVAC'
    },
    {
      question: 'How do I reset a POS system after a power outage?',
      answer: 'After power restoration: 1) Wait 2 minutes for full boot, 2) Check network connectivity, 3) Verify payment processor connection, 4) Test a small transaction.',
      category: 'POS Systems'
    },
    {
      question: 'What should I do if a security camera shows a blurry image?',
      answer: 'First check if the lens is clean. If still blurry, adjust the focus ring or check if the camera position has shifted. Contact support if issues persist.',
      category: 'Security'
    }
  ];

  const categories = [
    'All Categories',
    'Fuel Systems',
    'Network',
    'HVAC',
    'Security',
    'Power Systems',
    'POS Systems',
    'Building Maintenance'
  ];

  const filteredArticles = mockKnowledgeArticles.filter(article => {
    const matchesSearch = !searchTerm || 
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || 
      selectedCategory === 'All Categories' ||
      article.category.toLowerCase() === selectedCategory.toLowerCase();
    
    return matchesSearch && matchesCategory;
  });

  const filteredFAQs = mockFAQs.filter(faq => {
    const matchesSearch = !searchTerm || 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
      selectedCategory === 'All Categories' ||
      faq.category.toLowerCase() === selectedCategory.toLowerCase();
    
    return matchesSearch && matchesCategory;
  });

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
                <BreadcrumbLink>Knowledge Base</BreadcrumbLink>
              </BreadcrumbItem>
            </Breadcrumb>
            
            <HStack justify="space-between" align="center" mt={4}>
              <Heading size="lg" color={textPrimary}>
                📋 Knowledge Base
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
              Search our knowledge base for solutions and best practices
            </Text>
          </Box>

          <Divider />

          {/* Search and Filters */}
          <Card bg={cardBg} shadow="md" borderColor={borderColor}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <InputGroup size="lg">
                  <InputLeftElement pointerEvents="none">
                    <Icon as={MagnifyingGlassIcon} color="gray.400" />
                  </InputLeftElement>
                  <Input
                    placeholder="Search knowledge base..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    bg={cardBg}
                  />
                </InputGroup>
                
                <Text fontSize="sm" color={textSecondary}>
                  {category && `Searching in: ${category}`}
                  {q && ` • Query: "${q}"`}
                </Text>
              </VStack>
            </CardBody>
          </Card>

          {/* Content Tabs */}
          <Tabs variant="enclosed" colorScheme="purple">
            <TabList>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={BookOpenIcon} />
                  <Text>Articles ({filteredArticles.length})</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={QuestionMarkCircleIcon} />
                  <Text>FAQs ({filteredFAQs.length})</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={LightBulbIcon} />
                  <Text>Quick Tips</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              {/* Articles Tab */}
              <TabPanel px={0}>
                <VStack spacing={4} align="stretch">
                  {filteredArticles.length === 0 ? (
                    <Alert status="info">
                      <AlertIcon />
                      <AlertTitle>No articles found</AlertTitle>
                      <AlertDescription>
                        Try adjusting your search terms or browse all categories.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
                      {filteredArticles.map((article) => (
                        <Card key={article.id} bg={cardBg} shadow="md" borderColor={borderColor} cursor="pointer" _hover={{ shadow: 'lg', borderColor: 'purple.300' }}>
                          <CardHeader pb={2}>
                            <HStack justify="space-between" align="start">
                              <VStack align="start" spacing={1} flex={1}>
                                <Heading size="sm" color={textPrimary}>
                                  {article.title}
                                </Heading>
                                <Badge colorScheme="purple" size="sm">
                                  {article.category}
                                </Badge>
                              </VStack>
                              <Icon as={DocumentTextIcon} color="purple.500" boxSize={5} />
                            </HStack>
                          </CardHeader>
                          <CardBody pt={0}>
                            <VStack align="start" spacing={3}>
                              <Text fontSize="sm" color={textSecondary}>
                                {article.description}
                              </Text>
                              <HStack spacing={4} fontSize="xs" color={textSecondary}>
                                <Text>👁 {article.views} views</Text>
                                <Text>👍 {article.helpful} helpful</Text>
                                <Text>📅 {article.lastUpdated}</Text>
                              </HStack>
                              <HStack spacing={1} flexWrap="wrap">
                                {article.tags.slice(0, 3).map((tag, index) => (
                                  <Badge key={index} size="xs" variant="outline" colorScheme="gray">
                                    {tag}
                                  </Badge>
                                ))}
                              </HStack>
                            </VStack>
                          </CardBody>
                        </Card>
                      ))}
                    </SimpleGrid>
                  )}
                </VStack>
              </TabPanel>

              {/* FAQs Tab */}
              <TabPanel px={0}>
                <VStack spacing={4} align="stretch">
                  {filteredFAQs.length === 0 ? (
                    <Alert status="info">
                      <AlertIcon />
                      <AlertTitle>No FAQs found</AlertTitle>
                      <AlertDescription>
                        Try adjusting your search terms or browse all categories.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Accordion allowMultiple>
                      {filteredFAQs.map((faq, index) => (
                        <AccordionItem key={index}>
                          <AccordionButton>
                            <Box flex="1" textAlign="left">
                              <HStack justify="space-between" align="center" w="full">
                                <Text fontSize="md" fontWeight="semibold" color={textPrimary}>
                                  {faq.question}
                                </Text>
                                <Badge colorScheme="blue" size="sm">
                                  {faq.category}
                                </Badge>
                              </HStack>
                            </Box>
                            <AccordionIcon />
                          </AccordionButton>
                          <AccordionPanel pb={4}>
                            <Text color={textSecondary}>
                              {faq.answer}
                            </Text>
                          </AccordionPanel>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </VStack>
              </TabPanel>

              {/* Quick Tips Tab */}
              <TabPanel px={0}>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  <Card bg={cardBg} shadow="md" borderColor={borderColor}>
                    <CardHeader>
                      <HStack spacing={2}>
                        <Icon as={LightBulbIcon} color="yellow.500" />
                        <Heading size="sm">Emergency Contacts</Heading>
                      </HStack>
                    </CardHeader>
                    <CardBody>
                      <VStack align="start" spacing={2}>
                        <Text fontSize="sm">🚨 Emergency: 911</Text>
                        <Text fontSize="sm">🔧 Maintenance: (555) 123-4567</Text>
                        <Text fontSize="sm">💻 IT Support: (555) 234-5678</Text>
                        <Text fontSize="sm">🛡 Security: (555) 345-6789</Text>
                      </VStack>
                    </CardBody>
                  </Card>
                  
                  <Card bg={cardBg} shadow="md" borderColor={borderColor}>
                    <CardHeader>
                      <HStack spacing={2}>
                        <Icon as={LightBulbIcon} color="green.500" />
                        <Heading size="sm">Quick Resets</Heading>
                      </HStack>
                    </CardHeader>
                    <CardBody>
                      <VStack align="start" spacing={2}>
                        <Text fontSize="sm">🔌 Power cycle: 30 seconds</Text>
                        <Text fontSize="sm">🌐 Network reset: Hold reset 10s</Text>
                        <Text fontSize="sm">💳 POS restart: Ctrl+Alt+Del</Text>
                        <Text fontSize="sm">📹 Camera reboot: Unplug 60s</Text>
                      </VStack>
                    </CardBody>
                  </Card>
                  
                  <Card bg={cardBg} shadow="md" borderColor={borderColor}>
                    <CardHeader>
                      <HStack spacing={2}>
                        <Icon as={LightBulbIcon} color="blue.500" />
                        <Heading size="sm">Safety First</Heading>
                      </HStack>
                    </CardHeader>
                    <CardBody>
                      <VStack align="start" spacing={2}>
                        <Text fontSize="sm">⚠️ Always power off before service</Text>
                        <Text fontSize="sm">🧤 Use proper PPE</Text>
                        <Text fontSize="sm">🚫 Never work alone on electrical</Text>
                        <Text fontSize="sm">📞 Call for backup if unsure</Text>
                      </VStack>
                    </CardBody>
                  </Card>
                </SimpleGrid>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>
    </Box>
  );
}