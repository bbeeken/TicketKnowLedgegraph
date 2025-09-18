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
  AccordionIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Textarea,
  Select,
  Checkbox,
  CheckboxGroup,
  Stack
} from '@chakra-ui/react';
import { 
  ChevronRightIcon, 
  ArrowLeftIcon, 
  MagnifyingGlassIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  LightBulbIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

export default function KnowledgeBasePage() {
  const router = useRouter();
  const { category, q, from } = router.query;
  const [searchTerm, setSearchTerm] = useState((q as string) || '');
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState((category as string) || 'all');
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isNewArticleOpen, onOpen: onNewArticleOpen, onClose: onNewArticleClose } = useDisclosure();
  const [newArticle, setNewArticle] = useState({
    title: '',
    category: '',
    description: '',
    content: '',
    tags: ''
  });
  const toast = useToast();

  const handleBackNavigation = () => {
    if (from && typeof from === 'string') {
      // Decode the URL parameter and navigate back
      const decodedFrom = decodeURIComponent(from);
      router.push(decodedFrom);
    } else {
      // Fallback to tickets list
      router.push('/tickets');
    }
  };

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textPrimary = useColorModeValue('gray.900', 'white');
  const textSecondary = useColorModeValue('gray.600', 'gray.300');


  // State for dynamic knowledge articles and FAQs
  const [articles, setArticles] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [faqsLoading, setFaqsLoading] = useState(false);
  const [articlesError, setArticlesError] = useState<string | null>(null);
  const [faqsError, setFaqsError] = useState<string | null>(null);

  // Fetch articles from API
  useEffect(() => {
    setArticlesLoading(true);
    setArticlesError(null);
    fetch(`/api/knowledge/search?q=${encodeURIComponent(searchTerm || '*')}&type=documents&limit=20`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('opsgraph_token')}` }
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load articles');
        const data = await res.json();
        setArticles(data.results || []);
      })
      .catch((err) => setArticlesError(err.message))
      .finally(() => setArticlesLoading(false));
  }, [searchTerm]);

  // Fetch FAQs from API (using snippets as FAQ for now)
  useEffect(() => {
    setFaqsLoading(true);
    setFaqsError(null);
    fetch(`/api/knowledge/search?q=${encodeURIComponent(searchTerm || '*')}&type=snippets&limit=20`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('opsgraph_token')}` }
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load FAQs');
        const data = await res.json();
        setFaqs(data.results || []);
      })
      .catch((err) => setFaqsError(err.message))
      .finally(() => setFaqsLoading(false));
  }, [searchTerm]);

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

  const handleArticleClick = (article: any) => {
    setSelectedArticle(article);
    onOpen();
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = !searchTerm ||
      (article.title && article.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (article.summary && article.summary.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (article.tags && Array.isArray(article.tags) && article.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesCategory = selectedCategory === 'all' ||
      selectedCategory === 'All Categories' ||
      (article.category && article.category.toLowerCase() === selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = !searchTerm ||
      (faq.label && faq.label.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (faq.content && faq.content.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' ||
      selectedCategory === 'All Categories' ||
      (faq.category && faq.category.toLowerCase() === selectedCategory.toLowerCase());
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
                <BreadcrumbLink onClick={() => router.push('/dashboard')} color="blue.500" cursor="pointer">
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              {from && typeof from === 'string' && from.includes('/tickets/') ? (
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={handleBackNavigation} color="blue.500" cursor="pointer">
                    Tickets
                  </BreadcrumbLink>
                </BreadcrumbItem>
              ) : (
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={() => router.push('/tickets')} color="blue.500" cursor="pointer">
                    Tickets
                  </BreadcrumbLink>
                </BreadcrumbItem>
              )}
              <BreadcrumbItem isCurrentPage>
                <BreadcrumbLink>Knowledge Base</BreadcrumbLink>
              </BreadcrumbItem>
            </Breadcrumb>
            
            <HStack justify="space-between" align="center" mt={4}>
              <Heading size="lg" color={textPrimary}>
                📋 Knowledge Base
              </Heading>
              <HStack spacing={3}>
                <Button 
                  leftIcon={<Icon as={PlusIcon} />} 
                  colorScheme="purple" 
                  variant="solid"
                  onClick={onNewArticleOpen}
                >
                  Add Article
                </Button>
                <Button 
                  leftIcon={<Icon as={ArrowLeftIcon} />} 
                  variant="outline" 
                  onClick={handleBackNavigation}
                >
                  Back to Ticket
                </Button>
              </HStack>
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
                  <Text>Articles {articlesLoading ? <Spinner size="xs" /> : `(${filteredArticles.length})`}</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={QuestionMarkCircleIcon} />
                  <Text>FAQs {faqsLoading ? <Spinner size="xs" /> : `(${filteredFAQs.length})`}</Text>
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
                  {articlesError ? (
                    <Alert status="error">
                      <AlertIcon />
                      <AlertTitle>Error loading articles</AlertTitle>
                      <AlertDescription>{articlesError}</AlertDescription>
                    </Alert>
                  ) : articlesLoading ? (
                    <Box textAlign="center" py={8}><Spinner size="xl" /></Box>
                  ) : filteredArticles.length === 0 ? (
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
                        <Card 
                          key={article.id || article.document_id} 
                          bg={cardBg} 
                          shadow="md" 
                          borderColor={borderColor} 
                          cursor="pointer" 
                          _hover={{ shadow: 'lg', borderColor: 'purple.300' }}
                          onClick={() => handleArticleClick(article)}
                        >
                          <CardHeader pb={2}>
                            <HStack justify="space-between" align="start">
                              <VStack align="start" spacing={1} flex={1}>
                                <Heading size="sm" color={textPrimary}>
                                  {article.title}
                                </Heading>
                                <Badge colorScheme="purple" size="sm">
                                  {article.category || article.mime_type}
                                </Badge>
                              </VStack>
                              <Icon as={DocumentTextIcon} color="purple.500" boxSize={5} />
                            </HStack>
                          </CardHeader>
                          <CardBody pt={0}>
                            <VStack align="start" spacing={3}>
                              <Text fontSize="sm" color={textSecondary}>
                                {article.summary || article.content}
                              </Text>
                              <HStack spacing={4} fontSize="xs" color={textSecondary}>
                                <Text>� {article.created_at}</Text>
                              </HStack>
                              {article.tags && Array.isArray(article.tags) && (
                                <HStack spacing={1} flexWrap="wrap">
                                  {article.tags.slice(0, 3).map((tag: string, index: number) => (
                                    <Badge key={index} size="xs" variant="outline" colorScheme="gray">
                                      {tag}
                                    </Badge>
                                  ))}
                                </HStack>
                              )}
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
                  {faqsError ? (
                    <Alert status="error">
                      <AlertIcon />
                      <AlertTitle>Error loading FAQs</AlertTitle>
                      <AlertDescription>{faqsError}</AlertDescription>
                    </Alert>
                  ) : faqsLoading ? (
                    <Box textAlign="center" py={8}><Spinner size="xl" /></Box>
                  ) : filteredFAQs.length === 0 ? (
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
                                  {faq.label}
                                </Text>
                                <Badge colorScheme="blue" size="sm">
                                  {faq.category || faq.mime_type}
                                </Badge>
                              </HStack>
                            </Box>
                            <AccordionIcon />
                          </AccordionButton>
                          <AccordionPanel pb={4}>
                            <Text color={textSecondary}>
                              {faq.content}
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

      {/* Article Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="4xl">
        <ModalOverlay />
        <ModalContent maxH="80vh">
          <ModalHeader>
            {selectedArticle?.title}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto">
            {selectedArticle && (
              <VStack spacing={4} align="stretch">
                <HStack spacing={2} flexWrap="wrap">
                  <Badge colorScheme="purple">{selectedArticle.category}</Badge>
                  <Badge colorScheme="gray">{selectedArticle.views} views</Badge>
                  <Badge colorScheme="green">{selectedArticle.helpful} helpful</Badge>
                </HStack>

                <Text color={textSecondary}>
                  {selectedArticle.description}
                </Text>

                <Divider />

                <Box>
                  <Text fontWeight="semibold" mb={4}>Article Content:</Text>
                  <VStack spacing={4} align="stretch">
                    <Text lineHeight="1.6">
                      {selectedArticle.description}
                    </Text>
                    
                    {/* Enhanced content based on article category */}
                    {selectedArticle.category === 'Fuel Systems' && (
                      <Box>
                        <Text fontWeight="semibold" mb={2}>Common Error Codes:</Text>
                        <VStack spacing={2} align="stretch" pl={4}>
                          <Text fontSize="sm">• <strong>E001:</strong> Communication failure - Check network connection</Text>
                          <Text fontSize="sm">• <strong>E002:</strong> Calibration required - Contact certified technician</Text>
                          <Text fontSize="sm">• <strong>E003:</strong> Low fuel alarm - Refill tank immediately</Text>
                          <Text fontSize="sm">• <strong>E004:</strong> Pump motor failure - Replace motor unit</Text>
                        </VStack>
                      </Box>
                    )}
                    
                    {selectedArticle.category === 'Network' && (
                      <Box>
                        <Text fontWeight="semibold" mb={2}>Configuration Steps:</Text>
                        <VStack spacing={2} align="stretch" pl={4}>
                          <Text fontSize="sm">1. Access system settings via admin panel</Text>
                          <Text fontSize="sm">2. Navigate to Network Configuration</Text>
                          <Text fontSize="sm">3. Set IP address: 192.168.1.100-200 range</Text>
                          <Text fontSize="sm">4. Configure DNS: Primary 8.8.8.8, Secondary 8.8.4.4</Text>
                          <Text fontSize="sm">5. Test connectivity and save configuration</Text>
                        </VStack>
                      </Box>
                    )}
                    
                    {selectedArticle.category === 'Security' && (
                      <Box>
                        <Text fontWeight="semibold" mb={2}>Installation Guidelines:</Text>
                        <VStack spacing={2} align="stretch" pl={4}>
                          <Text fontSize="sm">• Mount cameras 8-10 feet high for optimal coverage</Text>
                          <Text fontSize="sm">• Ensure 30° downward tilt for facial recognition</Text>
                          <Text fontSize="sm">• Avoid direct sunlight in camera field of view</Text>
                          <Text fontSize="sm">• Test focus at various distances before final mounting</Text>
                        </VStack>
                      </Box>
                    )}
                    
                    <Alert status="info" borderRadius="md">
                      <AlertIcon />
                      <VStack align="start" spacing={1}>
                        <Text fontSize="sm" fontWeight="semibold">Related Articles</Text>
                        <Text fontSize="xs">Check the FAQs tab for quick answers related to this topic.</Text>
                      </VStack>
                    </Alert>
                  </VStack>
                </Box>

                {selectedArticle.tags && (
                  <Box>
                    <Text fontWeight="semibold" mb={2}>Tags:</Text>
                    <HStack spacing={1} flexWrap="wrap">
                      {selectedArticle.tags.map((tag: string, index: number) => (
                        <Badge key={index} size="sm" variant="outline" colorScheme="gray">
                          {tag}
                        </Badge>
                      ))}
                    </HStack>
                  </Box>
                )}

                <Divider />

                <HStack spacing={4} justify="space-between">
                  <HStack spacing={4} fontSize="sm" color={textSecondary}>
                    <Text>Last updated: {selectedArticle.lastUpdated}</Text>
                  </HStack>

                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      colorScheme="green"
                      onClick={() => {
                        toast({
                          title: 'Thank you for your feedback!',
                          description: 'Your input helps us improve our knowledge base.',
                          status: 'success',
                          duration: 3000,
                        });
                      }}
                    >
                      👍 Helpful
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      colorScheme="red"
                      onClick={() => {
                        toast({
                          title: 'Feedback received',
                          description: 'We will review this article for improvements.',
                          status: 'info',
                          duration: 3000,
                        });
                      }}
                    >
                      👎 Not Helpful
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast({
                          title: 'Link copied!',
                          description: 'Article link has been copied to clipboard.',
                          status: 'success',
                          duration: 2000,
                        });
                      }}
                    >
                      📋 Copy Link
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      colorScheme="purple"
                      onClick={() => {
                        toast({
                          title: 'Edit Feature',
                          description: 'Article editing will be available soon for authorized users.',
                          status: 'info',
                          duration: 3000,
                        });
                      }}
                    >
                      ✏️ Edit
                    </Button>
                  </HStack>
                </HStack>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* New Article Creation Modal */}
      <Modal isOpen={isNewArticleOpen} onClose={onNewArticleClose} size="4xl">
        <ModalOverlay />
        <ModalContent maxH="80vh">
          <ModalHeader>Create New Knowledge Article</ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto">
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Title</FormLabel>
                <Input
                  placeholder="Enter article title..."
                  value={newArticle.title}
                  onChange={(e) => setNewArticle({...newArticle, title: e.target.value})}
                />
              </FormControl>

              <HStack spacing={4}>
                <FormControl isRequired flex={1}>
                  <FormLabel>Category</FormLabel>
                  <Select
                    placeholder="Select category"
                    value={newArticle.category}
                    onChange={(e) => setNewArticle({...newArticle, category: e.target.value})}
                  >
                    <option value="Fuel Systems">Fuel Systems</option>
                    <option value="Network">Network</option>
                    <option value="HVAC">HVAC</option>
                    <option value="Security">Security</option>
                    <option value="Power Systems">Power Systems</option>
                    <option value="POS Systems">POS Systems</option>
                    <option value="Building Maintenance">Building Maintenance</option>
                  </Select>
                </FormControl>

                <FormControl flex={1}>
                  <FormLabel>Tags</FormLabel>
                  <Input
                    placeholder="Enter tags separated by commas..."
                    value={newArticle.tags}
                    onChange={(e) => setNewArticle({...newArticle, tags: e.target.value})}
                  />
                </FormControl>
              </HStack>

              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Textarea
                  placeholder="Brief description of the article..."
                  rows={3}
                  value={newArticle.description}
                  onChange={(e) => setNewArticle({...newArticle, description: e.target.value})}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Content</FormLabel>
                <Textarea
                  placeholder="Write your article content here..."
                  rows={10}
                  value={newArticle.content}
                  onChange={(e) => setNewArticle({...newArticle, content: e.target.value})}
                />
              </FormControl>

              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" fontWeight="semibold">Article Guidelines</Text>
                  <Text fontSize="xs">
                    • Use clear, concise language<br/>
                    • Include step-by-step instructions when applicable<br/>
                    • Add relevant tags to improve searchability<br/>
                    • Review content for accuracy before publishing
                  </Text>
                </VStack>
              </Alert>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={onNewArticleClose}>
                Cancel
              </Button>
              <Button
                colorScheme="purple"
                onClick={() => {
                  // TODO: Implement actual article creation API call
                  toast({
                    title: 'Article Created!',
                    description: `"${newArticle.title}" has been added to the knowledge base.`,
                    status: 'success',
                    duration: 3000,
                  });
                  setNewArticle({ title: '', category: '', description: '', content: '', tags: '' });
                  onNewArticleClose();
                }}
                isDisabled={!newArticle.title || !newArticle.category || !newArticle.description || !newArticle.content}
              >
                Create Article
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}