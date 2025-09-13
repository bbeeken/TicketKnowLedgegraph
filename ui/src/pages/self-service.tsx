import { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Input,
  Textarea,
  Select,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  SimpleGrid,
  Card,
  CardBody,
  Badge,
  Icon,
  useToast,
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
  List,
  ListItem,
  ListIcon,
  Image,
  Divider,
} from '@chakra-ui/react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  QuestionMarkCircleIcon,
  PhotoIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

const MotionBox = motion(Box);

interface TicketSubmission {
  category: string;
  subcategory: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  summary: string;
  description: string;
  location: string;
  photos: File[];
  contactPhone: string;
  contactEmail: string;
}

interface KnowledgeArticle {
  id: number;
  title: string;
  category: string;
  content: string;
  tags: string[];
  helpful: number;
  views: number;
  lastUpdated: string;
}

interface TroubleshootingGuide {
  id: number;
  title: string;
  problem: string;
  solution: string;
  estimatedTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tools: string[];
  steps: string[];
}

const mockKnowledgeBase: KnowledgeArticle[] = [
  {
    id: 1,
    title: 'Fuel Pump Not Dispensing',
    category: 'Fuel Systems',
    content: 'Common causes and solutions for fuel pump dispensing issues...',
    tags: ['fuel', 'pump', 'dispensing', 'nozzle'],
    helpful: 45,
    views: 234,
    lastUpdated: '2025-09-01',
  },
  {
    id: 2,
    title: 'POS Terminal Freezing',
    category: 'Point of Sale',
    content: 'Troubleshooting steps for frozen POS terminals...',
    tags: ['pos', 'terminal', 'freeze', 'payment'],
    helpful: 32,
    views: 189,
    lastUpdated: '2025-08-28',
  },
  {
    id: 3,
    title: 'HVAC Not Cooling',
    category: 'Climate Control',
    content: 'Diagnosing and fixing HVAC cooling problems...',
    tags: ['hvac', 'cooling', 'temperature', 'climate'],
    helpful: 28,
    views: 156,
    lastUpdated: '2025-08-25',
  },
];

const mockTroubleshootingGuides: TroubleshootingGuide[] = [
  {
    id: 1,
    title: 'Reset Fuel Pump Circuit Breaker',
    problem: 'Fuel pump not responding to card swipe',
    solution: 'Reset the circuit breaker and check connections',
    estimatedTime: '5 minutes',
    difficulty: 'Easy',
    tools: ['Circuit breaker key', 'Flashlight'],
    steps: [
      'Locate the fuel pump circuit breaker panel',
      'Identify the breaker labeled "Fuel Pump"',
      'Switch the breaker to OFF position',
      'Wait 30 seconds',
      'Switch back to ON position',
      'Test the fuel pump with a card',
    ],
  },
  {
    id: 2,
    title: 'Clear POS Terminal Cache',
    problem: 'POS terminal running slowly or freezing',
    solution: 'Clear application cache and restart terminal',
    estimatedTime: '3 minutes',
    difficulty: 'Easy',
    tools: ['POS terminal access code'],
    steps: [
      'Access terminal settings menu',
      'Navigate to System > Storage',
      'Select "Clear Cache"',
      'Confirm the action',
      'Restart the terminal',
      'Test transaction processing',
    ],
  },
];

export default function SelfServicePortal() {
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [ticketForm, setTicketForm] = useState<TicketSubmission>({
    category: '',
    subcategory: '',
    priority: 'Medium',
    summary: '',
    description: '',
    location: '',
    photos: [],
    contactPhone: '',
    contactEmail: '',
  });

  const toast = useToast();

  const categories = [
    'Fuel Systems',
    'Point of Sale',
    'Climate Control',
    'Security',
    'Electrical',
    'Plumbing',
    'Equipment',
    'Other',
  ];

  const handleTicketSubmit = async () => {
    try {
      // Submit ticket logic here
      toast({
        title: 'Ticket Submitted',
        description: 'Your ticket has been submitted successfully. You will receive updates via email.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      onClose();
      setTicketForm({
        category: '',
        subcategory: '',
        priority: 'Medium',
        summary: '',
        description: '',
        location: '',
        photos: [],
        contactPhone: '',
        contactEmail: '',
      });
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: 'There was an error submitting your ticket. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const filteredArticles = mockKnowledgeBase.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'green';
      case 'Medium': return 'yellow';
      case 'Hard': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Box p={6} bg="gray.50" minH="100vh">
      <VStack spacing={6} align="stretch" maxW="1200px" mx="auto">
        {/* Header */}
        <MotionBox
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Flex justify="space-between" align="center" mb={6}>
            <Box>
              <Text fontSize="3xl" fontWeight="bold" color="gray.900">
                Self-Service Portal
              </Text>
              <Text fontSize="md" color="gray.600">
                Submit tickets, access knowledge base, and troubleshoot issues
              </Text>
            </Box>
            <Button
              leftIcon={<PlusIcon width={20} />}
              colorScheme="blue"
              size="lg"
              onClick={onOpen}
            >
              Submit New Ticket
            </Button>
          </Flex>
        </MotionBox>

        {/* Search and Filter */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardBody>
              <HStack spacing={4}>
                <Box flex={1}>
                  <Input
                    placeholder="Search knowledge base, guides, or FAQs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="lg"
                  />
                </Box>
                <Select
                  placeholder="All Categories"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  w="200px"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </Select>
              </HStack>
            </CardBody>
          </Card>
        </MotionBox>

        {/* Main Content Tabs */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Tabs variant="enclosed" colorScheme="blue">
            <TabList>
              <Tab>
                <Icon as={QuestionMarkCircleIcon} mr={2} />
                Knowledge Base
              </Tab>
              <Tab>
                <Icon as={WrenchScrewdriverIcon} mr={2} />
                Troubleshooting Guides
              </Tab>
              <Tab>
                <Icon as={ClockIcon} mr={2} />
                My Tickets
              </Tab>
            </TabList>

            <TabPanels>
              {/* Knowledge Base Tab */}
              <TabPanel>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {filteredArticles.map((article) => (
                    <MotionBox
                      key={article.id}
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card h="full">
                        <CardBody>
                          <VStack spacing={3} align="stretch">
                            <Badge colorScheme="blue" alignSelf="flex-start">
                              {article.category}
                            </Badge>
                            <Text fontSize="lg" fontWeight="semibold">
                              {article.title}
                            </Text>
                            <Text fontSize="sm" color="gray.600" noOfLines={3}>
                              {article.content}
                            </Text>
                            <HStack spacing={2} flexWrap="wrap">
                              {article.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} size="sm" colorScheme="gray">
                                  {tag}
                                </Badge>
                              ))}
                            </HStack>
                            <HStack justify="space-between" fontSize="sm" color="gray.500">
                              <Text>{article.views} views</Text>
                              <Text>{article.helpful} helpful</Text>
                            </HStack>
                            <Button size="sm" colorScheme="blue" variant="outline">
                              Read More
                            </Button>
                          </VStack>
                        </CardBody>
                      </Card>
                    </MotionBox>
                  ))}
                </SimpleGrid>
              </TabPanel>

              {/* Troubleshooting Guides Tab */}
              <TabPanel>
                <VStack spacing={6} align="stretch">
                  {mockTroubleshootingGuides.map((guide) => (
                    <MotionBox
                      key={guide.id}
                      whileHover={{ scale: 1.01 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card>
                        <CardBody>
                          <VStack spacing={4} align="stretch">
                            <Flex justify="space-between" align="center">
                              <Text fontSize="lg" fontWeight="semibold">
                                {guide.title}
                              </Text>
                              <Badge colorScheme={getDifficultyColor(guide.difficulty)}>
                                {guide.difficulty}
                              </Badge>
                            </Flex>

                            <Text fontSize="sm" color="gray.600">
                              {guide.problem}
                            </Text>

                            <HStack spacing={4} fontSize="sm" color="gray.500">
                              <HStack>
                                <Icon as={ClockIcon} />
                                <Text>{guide.estimatedTime}</Text>
                              </HStack>
                              <HStack>
                                <Icon as={WrenchScrewdriverIcon} />
                                <Text>{guide.tools.length} tools needed</Text>
                              </HStack>
                            </HStack>

                            <Accordion allowToggle>
                              <AccordionItem>
                                <AccordionButton>
                                  <Box flex="1" textAlign="left">
                                    View Solution Steps
                                  </Box>
                                  <AccordionIcon />
                                </AccordionButton>
                                <AccordionPanel pb={4}>
                                  <List spacing={2}>
                                    {guide.steps.map((step, index) => (
                                      <ListItem key={index}>
                                        <ListIcon as={CheckCircleIcon} color="green.500" />
                                        {step}
                                      </ListItem>
                                    ))}
                                  </List>
                                </AccordionPanel>
                              </AccordionItem>
                            </Accordion>

                            <HStack spacing={2}>
                              <Button size="sm" colorScheme="green" flex={1}>
                                Mark as Completed
                              </Button>
                              <Button size="sm" variant="outline" flex={1}>
                                Still Need Help
                              </Button>
                            </HStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    </MotionBox>
                  ))}
                </VStack>
              </TabPanel>

              {/* My Tickets Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Card>
                    <CardBody>
                      <Text fontSize="lg" fontWeight="semibold" mb={4}>
                        Recent Tickets
                      </Text>
                      <VStack spacing={3} align="stretch">
                        {/* Mock ticket items */}
                        <HStack justify="space-between" p={3} border="1px" borderColor="gray.200" borderRadius="md">
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="semibold">Fuel Pump #3 Not Dispensing</Text>
                            <Text fontSize="sm" color="gray.600">Ticket #TK-2025-001</Text>
                          </VStack>
                          <VStack align="end" spacing={1}>
                            <Badge colorScheme="orange">In Progress</Badge>
                            <Text fontSize="sm" color="gray.600">2 hours ago</Text>
                          </VStack>
                        </HStack>

                        <HStack justify="space-between" p={3} border="1px" borderColor="gray.200" borderRadius="md">
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="semibold">POS Terminal Error</Text>
                            <Text fontSize="sm" color="gray.600">Ticket #TK-2025-002</Text>
                          </VStack>
                          <VStack align="end" spacing={1}>
                            <Badge colorScheme="green">Resolved</Badge>
                            <Text fontSize="sm" color="gray.600">1 day ago</Text>
                          </VStack>
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </MotionBox>
      </VStack>

      {/* Ticket Submission Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Submit New Ticket</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Box>
                  <Text mb={2}>Category *</Text>
                  <Select
                    placeholder="Select category"
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </Select>
                </Box>

                <Box>
                  <Text mb={2}>Priority *</Text>
                  <Select
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value as any })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </Select>
                </Box>
              </SimpleGrid>

              <Box>
                <Text mb={2}>Summary *</Text>
                <Input
                  placeholder="Brief description of the issue"
                  value={ticketForm.summary}
                  onChange={(e) => setTicketForm({ ...ticketForm, summary: e.target.value })}
                />
              </Box>

              <Box>
                <Text mb={2}>Description *</Text>
                <Textarea
                  placeholder="Detailed description of the issue, including when it started, what you observed, etc."
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  rows={4}
                />
              </Box>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Box>
                  <Text mb={2}>Location</Text>
                  <Input
                    placeholder="Specific location of the issue"
                    value={ticketForm.location}
                    onChange={(e) => setTicketForm({ ...ticketForm, location: e.target.value })}
                  />
                </Box>

                <Box>
                  <Text mb={2}>Contact Phone</Text>
                  <Input
                    placeholder="Your phone number"
                    value={ticketForm.contactPhone}
                    onChange={(e) => setTicketForm({ ...ticketForm, contactPhone: e.target.value })}
                  />
                </Box>
              </SimpleGrid>

              <Box>
                <Text mb={2}>Photos (Optional)</Text>
                <Button leftIcon={<PhotoIcon width={20} />} variant="outline" w="full">
                  Add Photos
                </Button>
              </Box>

              <Divider />

              <HStack spacing={4} justify="flex-end">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={handleTicketSubmit}
                  isDisabled={!ticketForm.category || !ticketForm.summary || !ticketForm.description}
                >
                  Submit Ticket
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
