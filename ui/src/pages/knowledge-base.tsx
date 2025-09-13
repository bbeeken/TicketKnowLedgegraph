import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Input,
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
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
} from '@chakra-ui/react';
import {
  MagnifyingGlassIcon,
  BookOpenIcon,
  VideoCameraIcon,
  QuestionMarkCircleIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  PlayIcon,
  HandThumbUpIcon,
  EyeIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

export interface KnowledgeArticle {
  id: number;
  title: string;
  category: string;
  subcategory?: string;
  content: string;
  summary: string;
  tags: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
  helpful: number;
  notHelpful: number;
  views: number;
  featured: boolean;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedReadTime: number; // in minutes
  relatedArticles: number[];
  attachments?: {
    type: 'image' | 'video' | 'document';
    url: string;
    filename: string;
  }[];
}

export interface TroubleshootingGuide {
  id: number;
  title: string;
  problem: string;
  solution: string;
  estimatedTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tools: string[];
  steps: string[];
  prerequisites: string[];
  warnings: string[];
  successRate: number;
  timeSaved: number; // average time saved in minutes
  categories: string[];
  tags: string[];
  videoUrl?: string;
  images: string[];
}

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  helpful: number;
  views: number;
  featured: boolean;
}

export interface VideoTutorial {
  id: number;
  title: string;
  description: string;
  duration: number; // in seconds
  thumbnailUrl: string;
  videoUrl: string;
  category: string;
  tags: string[];
  instructor: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  views: number;
  rating: number;
  transcript?: string;
  chapters: {
    title: string;
    timestamp: number;
  }[];
}

// Mock data
const mockArticles: KnowledgeArticle[] = [
  {
    id: 1,
    title: 'Complete Guide to Fuel System Maintenance',
    category: 'Fuel Systems',
    subcategory: 'Maintenance',
    content: `
# Fuel System Maintenance Guide

## Overview
Regular maintenance of fuel systems is crucial for preventing costly downtime and ensuring reliable operations.

## Key Components
- Fuel pumps and dispensers
- Underground storage tanks
- Piping and valves
- Leak detection systems
- Vapor recovery systems

## Maintenance Schedule
- Daily: Visual inspections
- Weekly: Performance testing
- Monthly: Leak detection checks
- Quarterly: Full system diagnostics
- Annually: Professional inspection

## Common Issues and Solutions

### Issue: Slow Fuel Flow
**Symptoms:** Customers report slow dispensing
**Causes:** Clogged filters, weak pump, air in lines
**Solutions:**
1. Check and replace fuel filters
2. Test pump pressure
3. Bleed air from lines
4. Clean dispenser nozzles

### Issue: Fuel Quality Problems
**Symptoms:** Engine performance issues, contamination
**Causes:** Water contamination, microbial growth
**Solutions:**
1. Regular fuel testing
2. Tank cleaning schedule
3. Additive treatments
4. Filtration system maintenance
    `,
    summary: 'Comprehensive guide covering fuel system components, maintenance schedules, and troubleshooting common issues.',
    tags: ['fuel', 'maintenance', 'pumps', 'tanks', 'filters'],
    author: 'John Smith',
    createdAt: '2025-08-01',
    updatedAt: '2025-09-01',
    helpful: 45,
    notHelpful: 2,
    views: 234,
    featured: true,
    difficulty: 'Intermediate',
    estimatedReadTime: 15,
    relatedArticles: [2, 3],
    attachments: [
      { type: 'image', url: '/images/fuel-system-diagram.png', filename: 'fuel-system-diagram.png' },
      { type: 'document', url: '/docs/fuel-maintenance-checklist.pdf', filename: 'fuel-maintenance-checklist.pdf' },
    ],
  },
  {
    id: 2,
    title: 'POS Terminal Troubleshooting',
    category: 'Point of Sale',
    subcategory: 'Hardware',
    content: `
# POS Terminal Troubleshooting Guide

## Common Issues

### Terminal Won't Start
1. Check power connection
2. Verify outlet functionality
3. Reset circuit breaker
4. Contact technical support if persistent

### Transaction Declines
1. Verify internet connection
2. Check card reader
3. Restart terminal
4. Process manually if needed

### Screen Freezes
1. Wait 30 seconds for auto-restart
2. Force restart using power button
3. Clear cache if available
4. Factory reset as last resort
    `,
    summary: 'Step-by-step troubleshooting for common POS terminal issues.',
    tags: ['pos', 'terminal', 'payment', 'hardware'],
    author: 'Sarah Johnson',
    createdAt: '2025-08-15',
    updatedAt: '2025-08-15',
    helpful: 32,
    notHelpful: 1,
    views: 189,
    featured: false,
    difficulty: 'Beginner',
    estimatedReadTime: 8,
    relatedArticles: [1, 4],
  },
];

const mockGuides: TroubleshootingGuide[] = [
  {
    id: 1,
    title: 'Reset Fuel Pump Circuit Breaker',
    problem: 'Fuel pump not responding to card swipe or displaying error messages',
    solution: 'Reset the circuit breaker and check electrical connections',
    estimatedTime: '5 minutes',
    difficulty: 'Easy',
    tools: ['Circuit breaker key', 'Flashlight', 'Multimeter (optional)'],
    steps: [
      'Locate the fuel pump circuit breaker panel (usually near the pump or in the station office)',
      'Identify the breaker labeled "Fuel Pump" or "Dispenser"',
      'Switch the breaker to OFF position',
      'Wait 30 seconds to discharge any residual electricity',
      'Switch back to ON position',
      'Test the fuel pump by attempting a transaction',
      'If issue persists, check for loose wiring or contact electrician',
    ],
    prerequisites: ['Basic electrical safety knowledge', 'Access to circuit breaker panel'],
    warnings: [
      'Always wear appropriate PPE when working with electrical equipment',
      'Do not attempt if you are not comfortable with electrical work',
      'If circuit breaker trips repeatedly, there may be a serious electrical issue',
    ],
    successRate: 85,
    timeSaved: 45,
    categories: ['Fuel Systems', 'Electrical'],
    tags: ['fuel pump', 'circuit breaker', 'electrical', 'reset'],
    images: ['/images/circuit-breaker-location.jpg', '/images/breaker-reset.jpg'],
  },
  {
    id: 2,
    title: 'Clear POS Terminal Cache and Restart',
    problem: 'POS terminal running slowly, freezing, or displaying error messages',
    solution: 'Clear application cache and perform a clean restart',
    estimatedTime: '3 minutes',
    difficulty: 'Easy',
    tools: ['POS terminal access code'],
    steps: [
      'Access the terminal settings menu using the manager code',
      'Navigate to System > Storage or Applications > Cache',
      'Select "Clear Cache" or "Clear Temporary Files"',
      'Confirm the action when prompted',
      'Return to main menu and select "Restart" or "Reboot"',
      'Wait for terminal to fully restart (usually 1-2 minutes)',
      'Test transaction processing to verify functionality',
    ],
    prerequisites: ['Manager access code for terminal'],
    warnings: [
      'Clearing cache will log out all users',
      'Some custom settings may need to be reconfigured',
      'Do not interrupt the restart process',
    ],
    successRate: 92,
    timeSaved: 30,
    categories: ['Point of Sale', 'Software'],
    tags: ['pos', 'cache', 'restart', 'performance'],
    images: ['/images/pos-cache-clear.jpg', '/images/pos-restart.jpg'],
  },
];

const mockFAQs: FAQ[] = [
  {
    id: 1,
    question: 'How do I report a fuel pump that is not working?',
    answer: 'Use the self-service portal to submit a ticket with photos of the pump and error messages. Include the pump number and exact location.',
    category: 'Fuel Systems',
    tags: ['fuel pump', 'reporting', 'ticket'],
    helpful: 28,
    views: 156,
    featured: true,
  },
  {
    id: 2,
    question: 'What should I do if the POS terminal shows "Network Error"?',
    answer: 'First, check the internet connection by attempting to browse a website. If connection is good, restart the terminal. If the error persists, submit a ticket.',
    category: 'Point of Sale',
    tags: ['pos', 'network', 'error'],
    helpful: 35,
    views: 203,
    featured: true,
  },
];

const mockVideos: VideoTutorial[] = [
  {
    id: 1,
    title: 'Fuel System Emergency Shutdown Procedure',
    description: 'Learn the proper steps to safely shut down fuel systems during emergencies.',
    duration: 420, // 7 minutes
    thumbnailUrl: '/videos/fuel-shutdown-thumbnail.jpg',
    videoUrl: '/videos/fuel-shutdown.mp4',
    category: 'Safety',
    tags: ['fuel', 'safety', 'emergency', 'shutdown'],
    instructor: 'Mike Rodriguez',
    difficulty: 'Intermediate',
    views: 89,
    rating: 4.8,
    chapters: [
      { title: 'Introduction', timestamp: 0 },
      { title: 'Preparation', timestamp: 45 },
      { title: 'Shutdown Steps', timestamp: 120 },
      { title: 'Verification', timestamp: 300 },
      { title: 'Post-Shutdown Procedures', timestamp: 360 },
    ],
  },
];

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<TroubleshootingGuide | null>(null);
  const toast = useToast();

  const categories = [
    'Fuel Systems',
    'Point of Sale',
    'Climate Control',
    'Security',
    'Electrical',
    'Plumbing',
    'Equipment',
    'Safety',
    'Maintenance',
  ];

  const filteredArticles = mockArticles.filter(article => {
    const matchesSearch = !searchQuery ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = !selectedCategory || article.category === selectedCategory;
    const matchesDifficulty = !selectedDifficulty || article.difficulty === selectedDifficulty;

    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const filteredGuides = mockGuides.filter(guide => {
    const matchesSearch = !searchQuery ||
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.problem.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = !selectedCategory ||
      guide.categories.some(cat => cat === selectedCategory);

    return matchesSearch && matchesCategory;
  });

  const filteredFAQs = mockFAQs.filter(faq => {
    const matchesSearch = !searchQuery ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = !selectedCategory || faq.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleArticleClick = (article: KnowledgeArticle) => {
    setSelectedArticle(article);
    onOpen();
  };

  const handleGuideClick = (guide: TroubleshootingGuide) => {
    setSelectedGuide(guide);
    onOpen();
  };

  const handleHelpful = (type: 'article' | 'faq', id: number, helpful: boolean) => {
    toast({
      title: helpful ? 'Thank you for your feedback!' : 'Feedback recorded',
      description: 'Your input helps us improve our knowledge base.',
      status: 'success',
      duration: 3000,
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': case 'Beginner': return 'green';
      case 'Medium': case 'Intermediate': return 'yellow';
      case 'Hard': case 'Advanced': return 'red';
      default: return 'gray';
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
                Knowledge Base
              </Text>
              <Text fontSize="md" color="gray.600">
                Find solutions, guides, and tutorials for common issues
              </Text>
            </Box>
          </Flex>
        </MotionBox>

        {/* Search and Filters */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
                <Box>
                  <Input
                    placeholder="Search articles, guides, FAQs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="lg"
                  />
                </Box>
                <Select
                  placeholder="All Categories"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </Select>
                <Select
                  placeholder="All Difficulties"
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </Select>
                <Button
                  leftIcon={<MagnifyingGlassIcon width={20} />}
                  colorScheme="blue"
                  size="lg"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('');
                    setSelectedDifficulty('');
                  }}
                >
                  Clear Filters
                </Button>
              </SimpleGrid>
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
                <Icon as={BookOpenIcon} mr={2} />
                Articles ({filteredArticles.length})
              </Tab>
              <Tab>
                <Icon as={WrenchScrewdriverIcon} mr={2} />
                Guides ({filteredGuides.length})
              </Tab>
              <Tab>
                <Icon as={QuestionMarkCircleIcon} mr={2} />
                FAQs ({filteredFAQs.length})
              </Tab>
              <Tab>
                <Icon as={VideoCameraIcon} mr={2} />
                Videos ({mockVideos.length})
              </Tab>
            </TabList>

            <TabPanels>
              {/* Articles Tab */}
              <TabPanel>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {filteredArticles.map((article) => (
                    <MotionBox
                      key={article.id}
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card h="full" cursor="pointer" onClick={() => handleArticleClick(article)}>
                        <CardBody>
                          <VStack spacing={3} align="stretch">
                            <Flex justify="space-between" align="center">
                              <Badge colorScheme="blue">{article.category}</Badge>
                              {article.featured && <Badge colorScheme="purple">Featured</Badge>}
                            </Flex>

                            <Text fontSize="lg" fontWeight="semibold" noOfLines={2}>
                              {article.title}
                            </Text>

                            <Text fontSize="sm" color="gray.600" noOfLines={3}>
                              {article.summary}
                            </Text>

                            <HStack spacing={2} flexWrap="wrap">
                              {article.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} size="sm" colorScheme="gray">
                                  {tag}
                                </Badge>
                              ))}
                            </HStack>

                            <HStack justify="space-between" fontSize="sm" color="gray.500">
                              <HStack>
                                <Icon as={EyeIcon} />
                                <Text>{article.views}</Text>
                              </HStack>
                              <HStack>
                                <Icon as={ClockIcon} />
                                <Text>{article.estimatedReadTime} min</Text>
                              </HStack>
                              <Badge size="sm" colorScheme={getDifficultyColor(article.difficulty)}>
                                {article.difficulty}
                              </Badge>
                            </HStack>

                            <HStack justify="space-between" fontSize="sm">
                              <Text color="gray.600">By {article.author}</Text>
                              <HStack>
                                <Icon as={HandThumbUpIcon} color="green.500" />
                                <Text>{article.helpful}</Text>
                              </HStack>
                            </HStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    </MotionBox>
                  ))}
                </SimpleGrid>
              </TabPanel>

              {/* Guides Tab */}
              <TabPanel>
                <VStack spacing={6} align="stretch">
                  {filteredGuides.map((guide) => (
                    <MotionBox
                      key={guide.id}
                      whileHover={{ scale: 1.01 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card cursor="pointer" onClick={() => handleGuideClick(guide)}>
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
                              <strong>Problem:</strong> {guide.problem}
                            </Text>

                            <HStack spacing={4} fontSize="sm" color="gray.500">
                              <HStack>
                                <Icon as={ClockIcon} />
                                <Text>{guide.estimatedTime}</Text>
                              </HStack>
                              <HStack>
                                <Icon as={WrenchScrewdriverIcon} />
                                <Text>{guide.tools.length} tools</Text>
                              </HStack>
                              <HStack>
                                <Icon as={UserGroupIcon} />
                                <Text>{guide.successRate}% success</Text>
                              </HStack>
                            </HStack>

                            <HStack spacing={2} flexWrap="wrap">
                              {guide.tags.slice(0, 4).map(tag => (
                                <Badge key={tag} size="sm" colorScheme="blue">
                                  {tag}
                                </Badge>
                              ))}
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

                            <HStack spacing={4} justify="flex-end">
                              <Button size="sm" colorScheme="green" variant="outline">
                                Mark as Completed
                              </Button>
                              <Button size="sm" variant="outline">
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

              {/* FAQs Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  {filteredFAQs.map((faq) => (
                    <MotionBox
                      key={faq.id}
                      whileHover={{ scale: 1.01 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card>
                        <CardBody>
                          <VStack spacing={3} align="stretch">
                            <Flex justify="space-between" align="center">
                              <Badge colorScheme="blue">{faq.category}</Badge>
                              {faq.featured && <Badge colorScheme="purple">Featured</Badge>}
                            </Flex>

                            <Text fontSize="lg" fontWeight="semibold">
                              {faq.question}
                            </Text>

                            <Text fontSize="sm" color="gray.600">
                              {faq.answer}
                            </Text>

                            <HStack spacing={2} flexWrap="wrap">
                              {faq.tags.map(tag => (
                                <Badge key={tag} size="sm" colorScheme="gray">
                                  {tag}
                                </Badge>
                              ))}
                            </HStack>

                            <HStack justify="space-between" fontSize="sm" color="gray.500">
                              <HStack>
                                <Icon as={EyeIcon} />
                                <Text>{faq.views} views</Text>
                              </HStack>
                              <HStack>
                                <Icon as={HandThumbUpIcon} />
                                <Text>{faq.helpful} helpful</Text>
                              </HStack>
                            </HStack>

                            <HStack spacing={4} justify="flex-end">
                              <Button
                                size="sm"
                                variant="outline"
                                colorScheme="green"
                                onClick={() => handleHelpful('faq', faq.id, true)}
                              >
                                <Icon as={HandThumbUpIcon} mr={1} />
                                Helpful
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                colorScheme="red"
                                onClick={() => handleHelpful('faq', faq.id, false)}
                              >
                                Not Helpful
                              </Button>
                            </HStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    </MotionBox>
                  ))}
                </VStack>
              </TabPanel>

              {/* Videos Tab */}
              <TabPanel>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {mockVideos.map((video) => (
                    <MotionBox
                      key={video.id}
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card cursor="pointer">
                        <CardBody>
                          <VStack spacing={3} align="stretch">
                            <Box position="relative">
                              <Image
                                src={video.thumbnailUrl}
                                alt={video.title}
                                borderRadius="md"
                                w="full"
                                h="150px"
                                objectFit="cover"
                              />
                              <Box
                                position="absolute"
                                top="50%"
                                left="50%"
                                transform="translate(-50%, -50%)"
                                bg="blackAlpha.700"
                                borderRadius="full"
                                p={3}
                              >
                                <Icon as={PlayIcon} w={6} h={6} color="white" />
                              </Box>
                              <Badge
                                position="absolute"
                                bottom={2}
                                right={2}
                                colorScheme="blackAlpha"
                              >
                                {formatDuration(video.duration)}
                              </Badge>
                            </Box>

                            <Text fontSize="lg" fontWeight="semibold" noOfLines={2}>
                              {video.title}
                            </Text>

                            <Text fontSize="sm" color="gray.600" noOfLines={2}>
                              {video.description}
                            </Text>

                            <HStack justify="space-between" fontSize="sm" color="gray.500">
                              <Text>{video.instructor}</Text>
                              <HStack>
                                <Icon as={EyeIcon} />
                                <Text>{video.views}</Text>
                              </HStack>
                            </HStack>

                            <HStack spacing={2}>
                              <Badge colorScheme="blue">{video.category}</Badge>
                              <Badge colorScheme={getDifficultyColor(video.difficulty)}>
                                {video.difficulty}
                              </Badge>
                            </HStack>

                            <Button size="sm" colorScheme="blue" leftIcon={<PlayIcon width={16} />}>
                              Watch Now
                            </Button>
                          </VStack>
                        </CardBody>
                      </Card>
                    </MotionBox>
                  ))}
                </SimpleGrid>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </MotionBox>
      </VStack>

      {/* Article Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="4xl">
        <ModalOverlay />
        <ModalContent maxH="80vh">
          <ModalHeader>
            {selectedArticle?.title || selectedGuide?.title}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto">
            {selectedArticle && (
              <VStack spacing={4} align="stretch">
                <HStack spacing={2} flexWrap="wrap">
                  <Badge colorScheme="blue">{selectedArticle.category}</Badge>
                  <Badge colorScheme={getDifficultyColor(selectedArticle.difficulty)}>
                    {selectedArticle.difficulty}
                  </Badge>
                  <Badge colorScheme="gray">
                    {selectedArticle.estimatedReadTime} min read
                  </Badge>
                </HStack>

                <div dangerouslySetInnerHTML={{ __html: selectedArticle.content }} />

                {selectedArticle.attachments && selectedArticle.attachments.length > 0 && (
                  <Box>
                    <Text fontWeight="semibold" mb={2}>Attachments:</Text>
                    <HStack spacing={2} flexWrap="wrap">
                      {selectedArticle.attachments.map((attachment, index) => (
                        <Button key={index} size="sm" variant="outline" leftIcon={<DocumentTextIcon width={16} />}>
                          {attachment.filename}
                        </Button>
                      ))}
                    </HStack>
                  </Box>
                )}

                <Divider />

                <HStack spacing={4} justify="space-between">
                  <HStack spacing={4} fontSize="sm" color="gray.600">
                    <Text>By {selectedArticle.author}</Text>
                    <Text>Updated {selectedArticle.updatedAt}</Text>
                    <Text>{selectedArticle.views} views</Text>
                  </HStack>

                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      colorScheme="green"
                      onClick={() => handleHelpful('article', selectedArticle.id, true)}
                    >
                      <Icon as={HandThumbUpIcon} mr={1} />
                      Helpful ({selectedArticle.helpful})
                    </Button>
                    <Button size="sm" variant="outline">
                      Share
                    </Button>
                  </HStack>
                </HStack>
              </VStack>
            )}

            {selectedGuide && (
              <VStack spacing={4} align="stretch">
                <HStack spacing={2} flexWrap="wrap">
                  <Badge colorScheme={getDifficultyColor(selectedGuide.difficulty)}>
                    {selectedGuide.difficulty}
                  </Badge>
                  <Badge colorScheme="blue">{selectedGuide.estimatedTime}</Badge>
                  <Badge colorScheme="green">{selectedGuide.successRate}% Success Rate</Badge>
                </HStack>

                <Box>
                  <Text fontWeight="semibold" mb={2}>Problem:</Text>
                  <Text>{selectedGuide.problem}</Text>
                </Box>

                <Box>
                  <Text fontWeight="semibold" mb={2}>Solution:</Text>
                  <Text>{selectedGuide.solution}</Text>
                </Box>

                {selectedGuide.prerequisites.length > 0 && (
                  <Box>
                    <Text fontWeight="semibold" mb={2}>Prerequisites:</Text>
                    <List spacing={1}>
                      {selectedGuide.prerequisites.map((prereq, index) => (
                        <ListItem key={index} fontSize="sm">
                          <ListIcon as={CheckCircleIcon} color="blue.500" />
                          {prereq}
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                <Box>
                  <Text fontWeight="semibold" mb={2}>Required Tools:</Text>
                  <HStack spacing={2} flexWrap="wrap">
                    {selectedGuide.tools.map((tool, index) => (
                      <Badge key={index} colorScheme="orange">{tool}</Badge>
                    ))}
                  </HStack>
                </Box>

                <Box>
                  <Text fontWeight="semibold" mb={2}>Step-by-Step Solution:</Text>
                  <List spacing={3}>
                    {selectedGuide.steps.map((step, index) => (
                      <ListItem key={index}>
                        <HStack align="start">
                          <Badge colorScheme="blue" mr={3} mt={1}>
                            {index + 1}
                          </Badge>
                          <Text>{step}</Text>
                        </HStack>
                      </ListItem>
                    ))}
                  </List>
                </Box>

                {selectedGuide.warnings.length > 0 && (
                  <Box bg="red.50" p={3} borderRadius="md" border="1px" borderColor="red.200">
                    <Text fontWeight="semibold" mb={2} color="red.700">⚠️ Safety Warnings:</Text>
                    <List spacing={1}>
                      {selectedGuide.warnings.map((warning, index) => (
                        <ListItem key={index} fontSize="sm" color="red.700">
                          {warning}
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                <HStack spacing={4} justify="flex-end">
                  <Button colorScheme="green" onClick={() => {
                    toast({
                      title: 'Guide Completed!',
                      description: 'Great job! This should save you about ' + selectedGuide.timeSaved + ' minutes.',
                      status: 'success',
                      duration: 5000,
                    });
                    onClose();
                  }}>
                    Mark as Completed
                  </Button>
                  <Button variant="outline" onClick={() => {
                    // Would navigate to ticket creation
                    onClose();
                  }}>
                    Still Need Help
                  </Button>
                </HStack>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
