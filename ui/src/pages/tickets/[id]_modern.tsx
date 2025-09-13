import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  getTicket, 
  getTicketMessages, 
  postTicketMessage, 
  patchTicketType, 
  getTicketMetadata,
  updateTicketFields,
  type TicketMetadata 
} from '@/lib/api/tickets';
import { 
  Box, 
  Button, 
  HStack, 
  Heading, 
  Select, 
  Text, 
  VStack, 
  useToast,
  Grid,
  GridItem,
  Badge,
  Divider,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Avatar,
  Flex,
  Tag,
  TagLabel,
  Textarea,
  Icon,
  Stack,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  FormControl,
  FormLabel,
  IconButton,
  useDisclosure,
  Container,
  AspectRatio,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Progress,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  Skeleton,
  SkeletonText,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Tooltip,
  Center,
  Spinner,
  Radio,
  RadioGroup,
  Checkbox,
  CheckboxGroup
} from '@chakra-ui/react';

import {
  CheckIcon,
  XMarkIcon,
  PencilIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  PaperClipIcon,
  EyeIcon,
  CalendarIcon,
  TagIcon,
  ChevronRightIcon,
  PlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function TicketDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [metadata, setMetadata] = useState<TicketMetadata | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Theme colors
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textPrimary = useColorModeValue('gray.900', 'white');
  const textSecondary = useColorModeValue('gray.600', 'gray.300');
  const accentColor = useColorModeValue('blue.500', 'blue.300');
  const successColor = useColorModeValue('green.500', 'green.300');
  const warningColor = useColorModeValue('orange.500', 'orange.300');
  const dangerColor = useColorModeValue('red.500', 'red.300');

  const [ticketType, setTicketType] = useState('user_request');
  const [formFields, setFormFields] = useState<any>({});

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setIsLoading(true);
        const [t, msgs, meta] = await Promise.all([
          getTicket(Number(id)),
          getTicketMessages(Number(id)),
          getTicketMetadata()
        ]);
        setTicket(t);
        setMessages(msgs);
        setMetadata(meta);
        setEditValues({
          summary: t.summary,
          description: t.description,
          assignee_user_id: t.assignee_user_id,
          category_id: t.category_id,
          site_id: t.site_id,
          status: t.status,
          substatus_code: t.substatus_code,
          severity: t.severity,
          privacy_level: t.privacy_level
        });
        
        // Determine ticket type based on category or other fields
        if (t.category_name?.toLowerCase().includes('order')) {
          setTicketType('order_request');
        } else if (t.category_name?.toLowerCase().includes('change')) {
          setTicketType('change_request');
        } else {
          setTicketType('user_request');
        }
      } catch (e: any) {
        toast({ status: 'error', title: 'Failed to load ticket', description: e.message });
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id, toast]);

  const postMessage = async () => {
    if (!newMessage.trim()) {
      toast({ status: 'warning', title: 'Please enter a message' });
      return;
    }

    setSubmitting(true);
    try {
      await postTicketMessage(Number(id), newMessage);
      const updatedMessages = await getTicketMessages(Number(id));
      setMessages(updatedMessages);
      setNewMessage('');
      toast({ 
        status: 'success', 
        title: 'Message posted', 
        description: 'Your message has been added to the ticket',
        duration: 3000
      });
    } catch (e: any) {
      toast({ status: 'error', title: 'Failed to post message', description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const saveChanges = async () => {
    try {
      setSubmitting(true);
      await updateTicketFields(Number(id), editValues);
      const updatedTicket = await getTicket(Number(id));
      setTicket(updatedTicket);
      setEditMode(false);
      toast({ 
        status: 'success', 
        title: 'Ticket updated', 
        description: 'Changes have been saved successfully',
        duration: 3000
      });
    } catch (e: any) {
      toast({ status: 'error', title: 'Failed to update ticket', description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 1: return 'green';
      case 2: return 'blue';
      case 3: return 'yellow';
      case 4: return 'orange';
      case 5: return 'red';
      default: return 'gray';
    }
  };

  const getSeverityLabel = (severity: number) => {
    switch (severity) {
      case 1: return 'Low';
      case 2: return 'Medium';
      case 3: return 'High';
      case 4: return 'Critical';
      case 5: return 'Emergency';
      default: return 'Unknown';
    }
  };

  const getStatusProgress = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open': return 25;
      case 'in progress': return 50;
      case 'pending': return 75;
      case 'resolved': return 90;
      case 'closed': return 100;
      default: return 0;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'blue';
      case 'in progress': return 'yellow';
      case 'pending': return 'orange';
      case 'resolved': return 'green';
      case 'closed': return 'gray';
      default: return 'gray';
    }
  };

  const renderDynamicForm = () => {
    switch (ticketType) {
      case 'order_request':
        return (
          <Card bg={cardBg} shadow="lg" borderColor={borderColor}>
            <CardHeader bg="blue.50" borderBottom="1px" borderColor={borderColor}>
              <HStack>
                <Icon as={TagIcon} color="blue.500" />
                <Heading size="md" color="blue.700">Order Request Details</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <FormControl>
                    <FormLabel color={textSecondary}>Item/Service</FormLabel>
                    <Input 
                      value={formFields.item || ''} 
                      onChange={(e) => setFormFields({...formFields, item: e.target.value})}
                      placeholder="What are you ordering?"
                      bg={cardBg}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel color={textSecondary}>Quantity</FormLabel>
                    <NumberInput 
                      value={formFields.quantity || 1} 
                      onChange={(value) => setFormFields({...formFields, quantity: Number(value)})}
                      min={1}
                    >
                      <NumberInputField bg={cardBg} />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                  <FormControl>
                    <FormLabel color={textSecondary}>Estimated Cost</FormLabel>
                    <Input 
                      value={formFields.cost || ''} 
                      onChange={(e) => setFormFields({...formFields, cost: e.target.value})}
                      placeholder="$0.00"
                      bg={cardBg}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel color={textSecondary}>Delivery Date</FormLabel>
                    <Input 
                      type="date"
                      value={formFields.delivery_date || ''} 
                      onChange={(e) => setFormFields({...formFields, delivery_date: e.target.value})}
                      bg={cardBg}
                    />
                  </FormControl>
                </SimpleGrid>
                <FormControl>
                  <FormLabel color={textSecondary}>Business Justification</FormLabel>
                  <Textarea 
                    value={formFields.justification || ''} 
                    onChange={(e) => setFormFields({...formFields, justification: e.target.value})}
                    placeholder="Why is this order necessary?"
                    rows={3}
                    bg={cardBg}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel color={textSecondary}>Approval Required</FormLabel>
                  <RadioGroup 
                    value={formFields.approval_required || 'no'} 
                    onChange={(value) => setFormFields({...formFields, approval_required: value})}
                  >
                    <HStack spacing={6}>
                      <Radio value="yes" colorScheme="blue">Yes</Radio>
                      <Radio value="no" colorScheme="blue">No</Radio>
                    </HStack>
                  </RadioGroup>
                </FormControl>
              </VStack>
            </CardBody>
          </Card>
        );

      case 'change_request':
        return (
          <Card bg={cardBg} shadow="lg" borderColor={borderColor}>
            <CardHeader bg="orange.50" borderBottom="1px" borderColor={borderColor}>
              <HStack>
                <Icon as={ArrowPathIcon} color="orange.500" />
                <Heading size="md" color="orange.700">Change Request Details</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <FormControl>
                    <FormLabel color={textSecondary}>Change Type</FormLabel>
                    <Select 
                      value={formFields.change_type || ''} 
                      onChange={(e) => setFormFields({...formFields, change_type: e.target.value})}
                      bg={cardBg}
                    >
                      <option value="">Select change type</option>
                      <option value="standard">Standard Change</option>
                      <option value="normal">Normal Change</option>
                      <option value="emergency">Emergency Change</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel color={textSecondary}>Risk Level</FormLabel>
                    <Select 
                      value={formFields.risk_level || ''} 
                      onChange={(e) => setFormFields({...formFields, risk_level: e.target.value})}
                      bg={cardBg}
                    >
                      <option value="">Select risk level</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel color={textSecondary}>Implementation Date</FormLabel>
                    <Input 
                      type="datetime-local"
                      value={formFields.implementation_date || ''} 
                      onChange={(e) => setFormFields({...formFields, implementation_date: e.target.value})}
                      bg={cardBg}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel color={textSecondary}>Rollback Plan Required</FormLabel>
                    <Switch 
                      isChecked={formFields.rollback_required || false} 
                      onChange={(e) => setFormFields({...formFields, rollback_required: e.target.checked})}
                      colorScheme="blue"
                    />
                  </FormControl>
                </SimpleGrid>
                <FormControl>
                  <FormLabel color={textSecondary}>Current State</FormLabel>
                  <Textarea 
                    value={formFields.current_state || ''} 
                    onChange={(e) => setFormFields({...formFields, current_state: e.target.value})}
                    placeholder="Describe the current state"
                    rows={3}
                    bg={cardBg}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel color={textSecondary}>Desired State</FormLabel>
                  <Textarea 
                    value={formFields.desired_state || ''} 
                    onChange={(e) => setFormFields({...formFields, desired_state: e.target.value})}
                    placeholder="Describe the desired state after change"
                    rows={3}
                    bg={cardBg}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel color={textSecondary}>Impact Assessment</FormLabel>
                  <Textarea 
                    value={formFields.impact_assessment || ''} 
                    onChange={(e) => setFormFields({...formFields, impact_assessment: e.target.value})}
                    placeholder="What will be impacted by this change?"
                    rows={3}
                    bg={cardBg}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel color={textSecondary}>Affected Systems</FormLabel>
                  <CheckboxGroup 
                    value={formFields.affected_systems || []} 
                    onChange={(value) => setFormFields({...formFields, affected_systems: value})}
                  >
                    <SimpleGrid columns={{ base: 2, md: 3 }} spacing={2}>
                      <Checkbox value="network" colorScheme="blue">Network</Checkbox>
                      <Checkbox value="servers" colorScheme="blue">Servers</Checkbox>
                      <Checkbox value="database" colorScheme="blue">Database</Checkbox>
                      <Checkbox value="application" colorScheme="blue">Application</Checkbox>
                      <Checkbox value="security" colorScheme="blue">Security</Checkbox>
                      <Checkbox value="other" colorScheme="blue">Other</Checkbox>
                    </SimpleGrid>
                  </CheckboxGroup>
                </FormControl>
              </VStack>
            </CardBody>
          </Card>
        );

      default: // user_request
        return (
          <Card bg={cardBg} shadow="lg" borderColor={borderColor}>
            <CardHeader bg="green.50" borderBottom="1px" borderColor={borderColor}>
              <HStack>
                <Icon as={UserIcon} color="green.500" />
                <Heading size="md" color="green.700">User Request Details</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <FormControl>
                    <FormLabel color={textSecondary}>Request Type</FormLabel>
                    <Select 
                      value={formFields.request_type || ''} 
                      onChange={(e) => setFormFields({...formFields, request_type: e.target.value})}
                      bg={cardBg}
                    >
                      <option value="">Select request type</option>
                      <option value="access">Access Request</option>
                      <option value="software">Software Request</option>
                      <option value="hardware">Hardware Request</option>
                      <option value="training">Training Request</option>
                      <option value="support">Technical Support</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel color={textSecondary}>Urgency</FormLabel>
                    <Select 
                      value={formFields.urgency || ''} 
                      onChange={(e) => setFormFields({...formFields, urgency: e.target.value})}
                      bg={cardBg}
                    >
                      <option value="">Select urgency</option>
                      <option value="low">Low - Can wait</option>
                      <option value="medium">Medium - Normal timeline</option>
                      <option value="high">High - ASAP</option>
                      <option value="critical">Critical - Blocking work</option>
                    </Select>
                  </FormControl>
                </SimpleGrid>
                <FormControl>
                  <FormLabel color={textSecondary}>Business Impact</FormLabel>
                  <Textarea 
                    value={formFields.business_impact || ''} 
                    onChange={(e) => setFormFields({...formFields, business_impact: e.target.value})}
                    placeholder="How does this impact your work or business operations?"
                    rows={3}
                    bg={cardBg}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel color={textSecondary}>Preferred Resolution Date</FormLabel>
                  <Input 
                    type="date"
                    value={formFields.preferred_date || ''} 
                    onChange={(e) => setFormFields({...formFields, preferred_date: e.target.value})}
                    bg={cardBg}
                  />
                </FormControl>
              </VStack>
            </CardBody>
          </Card>
        );
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <Container maxW="7xl" py={8}>
          <VStack spacing={6} align="stretch">
            <Skeleton height="60px" />
            <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6}>
              <GridItem colSpan={{ base: 1, lg: 2 }}>
                <VStack spacing={6} align="stretch">
                  <SkeletonText noOfLines={8} spacing="4" />
                  <SkeletonText noOfLines={6} spacing="4" />
                </VStack>
              </GridItem>
              <GridItem>
                <SkeletonText noOfLines={10} spacing="4" />
              </GridItem>
            </SimpleGrid>
          </VStack>
        </Container>
      </AppLayout>
    );
  }

  if (!ticket) {
    return (
      <AppLayout>
        <Container maxW="7xl" py={8}>
          <Center h="200px">
            <Alert status="error">
              <AlertIcon />
              <AlertTitle>Ticket not found!</AlertTitle>
              <AlertDescription>The ticket you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.</AlertDescription>
            </Alert>
          </Center>
        </Container>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box bg={bgColor} minH="100vh" py={6}>
        <Container maxW="7xl">
          {/* Breadcrumb Navigation */}
          <Breadcrumb mb={6} fontSize="sm" color={textSecondary}>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard" color={accentColor}>Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink href="/tickets" color={accentColor}>Tickets</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink color={textSecondary}>#{ticket.ticket_id}</BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>

          {/* Header Card */}
          <Card bg={cardBg} shadow="xl" borderColor={borderColor} mb={6}>
            <CardHeader bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)" color="white" borderTopRadius="md">
              <Flex justify="space-between" align="center">
                <VStack align="start" spacing={2}>
                  <HStack>
                    <Heading size="lg" fontWeight="bold">
                      Ticket #{ticket.ticket_id}
                    </Heading>
                    <Badge 
                      colorScheme={getStatusColor(ticket.status)} 
                      variant="solid" 
                      px={3} 
                      py={1} 
                      borderRadius="full"
                      fontSize="sm"
                      fontWeight="bold"
                    >
                      {ticket.status}
                    </Badge>
                    <Badge 
                      colorScheme={getSeverityColor(ticket.severity)} 
                      variant="solid" 
                      px={3} 
                      py={1} 
                      borderRadius="full"
                      fontSize="sm"
                    >
                      {getSeverityLabel(ticket.severity)} Priority
                    </Badge>
                  </HStack>
                  <Text fontSize="xl" fontWeight="semibold" opacity={0.9}>
                    {ticket.summary}
                  </Text>
                  <HStack spacing={4} fontSize="sm" opacity={0.8}>
                    <HStack>
                      <Icon as={UserIcon} />
                      <Text>Created by {ticket.creator_name || 'Unknown'}</Text>
                    </HStack>
                    <HStack>
                      <Icon as={CalendarIcon} />
                      <Text>{new Date(ticket.created_at).toLocaleDateString()}</Text>
                    </HStack>
                    <HStack>
                      <Icon as={BuildingOfficeIcon} />
                      <Text>{ticket.site_name || 'No site'}</Text>
                    </HStack>
                  </HStack>
                </VStack>
                
                <VStack align="end" spacing={3}>
                  <Menu>
                    <MenuButton 
                      as={Button} 
                      colorScheme="whiteAlpha" 
                      variant="outline" 
                      size="sm"
                      color="white"
                      borderColor="whiteAlpha.300"
                      _hover={{ bg: 'whiteAlpha.200' }}
                    >
                      Actions
                    </MenuButton>
                    <MenuList>
                      <MenuItem onClick={() => setEditMode(!editMode)}>
                        <Icon as={PencilIcon} mr={2} />
                        {editMode ? 'Cancel Edit' : 'Edit Ticket'}
                      </MenuItem>
                      <MenuItem>
                        <Icon as={EyeIcon} mr={2} />
                        Add Watcher
                      </MenuItem>
                      <MenuItem>
                        <Icon as={PaperClipIcon} mr={2} />
                        Add Attachment
                      </MenuItem>
                    </MenuList>
                  </Menu>
                  
                  <Box w="200px">
                    <Text fontSize="xs" opacity={0.8} mb={1}>Progress: {getStatusProgress(ticket.status)}%</Text>
                    <Progress 
                      value={getStatusProgress(ticket.status)} 
                      colorScheme="cyan" 
                      size="sm" 
                      borderRadius="full"
                      bg="whiteAlpha.300"
                    />
                  </Box>
                </VStack>
              </Flex>
            </CardHeader>
          </Card>

          {/* Main Content Grid */}
          <Grid templateColumns={{ base: "1fr", lg: "1fr 350px" }} gap={6}>
            {/* Left Column - Main Content */}
            <VStack spacing={6} align="stretch">
              {/* Tabbed Interface */}
              <Card bg={cardBg} shadow="lg" borderColor={borderColor}>
                <Tabs index={tabIndex} onChange={setTabIndex} colorScheme="blue">
                  <TabList bg="gray.50" borderTopRadius="md">
                    <Tab _selected={{ color: accentColor, borderColor: accentColor, fontWeight: 'bold' }}>
                      <Icon as={ChatBubbleLeftRightIcon} mr={2} />
                      Details & Activity
                    </Tab>
                    <Tab _selected={{ color: accentColor, borderColor: accentColor, fontWeight: 'bold' }}>
                      <Icon as={TagIcon} mr={2} />
                      {ticketType === 'order_request' ? 'Order Form' : 
                       ticketType === 'change_request' ? 'Change Form' : 'Request Form'}
                    </Tab>
                  </TabList>

                  <TabPanels>
                    {/* Details & Activity Tab */}
                    <TabPanel>
                      <VStack spacing={6} align="stretch">
                        {/* Description */}
                        <Box>
                          <Heading size="md" color={textPrimary} mb={3}>
                            Description
                          </Heading>
                          <Card bg="gray.50" borderColor={borderColor}>
                            <CardBody>
                              {editMode ? (
                                <Textarea
                                  value={editValues.description || ''}
                                  onChange={(e) => setEditValues({...editValues, description: e.target.value})}
                                  placeholder="Enter description..."
                                  rows={6}
                                  bg={cardBg}
                                />
                              ) : (
                                <Text color={textSecondary} whiteSpace="pre-wrap">
                                  {ticket.description || 'No description provided'}
                                </Text>
                              )}
                            </CardBody>
                          </Card>
                        </Box>

                        {/* Activity Feed */}
                        <Box>
                          <Heading size="md" color={textPrimary} mb={3}>
                            Activity Feed
                          </Heading>
                          <VStack spacing={4} align="stretch">
                            {messages.length === 0 ? (
                              <Card bg="blue.50" borderColor="blue.200">
                                <CardBody textAlign="center" py={8}>
                                  <Icon as={ChatBubbleLeftRightIcon} boxSize={12} color="blue.400" mb={3} />
                                  <Text color="blue.600" fontSize="lg" fontWeight="semibold">
                                    No messages yet
                                  </Text>
                                  <Text color="blue.500" fontSize="sm">
                                    Be the first to add a comment to this ticket
                                  </Text>
                                </CardBody>
                              </Card>
                            ) : (
                              messages.map((message, index) => (
                                <Card key={index} bg={cardBg} borderColor={borderColor} shadow="sm">
                                  <CardBody>
                                    <Flex gap={3}>
                                      <Avatar size="sm" name={message.author_name} bg="blue.500" />
                                      <Box flex={1}>
                                        <HStack justify="space-between" mb={2}>
                                          <Text fontWeight="bold" color={textPrimary}>
                                            {message.author_name || 'Unknown User'}
                                          </Text>
                                          <Text fontSize="sm" color={textSecondary}>
                                            {new Date(message.created_at).toLocaleString()}
                                          </Text>
                                        </HStack>
                                        <Text color={textSecondary} whiteSpace="pre-wrap">
                                          {message.body}
                                        </Text>
                                      </Box>
                                    </Flex>
                                  </CardBody>
                                </Card>
                              ))
                            )}
                          </VStack>
                        </Box>

                        {/* Add Message */}
                        <Card bg={cardBg} borderColor="blue.200" shadow="md">
                          <CardHeader bg="blue.50" borderTopRadius="md">
                            <Heading size="sm" color="blue.700">
                              <Icon as={PlusIcon} mr={2} />
                              Add Message
                            </Heading>
                          </CardHeader>
                          <CardBody>
                            <VStack spacing={4}>
                              <Textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Add a comment or update..."
                                rows={4}
                                bg={cardBg}
                                borderColor={borderColor}
                                _focus={{ borderColor: accentColor, boxShadow: `0 0 0 1px ${accentColor}` }}
                              />
                              <Flex w="full" justify="space-between" align="center">
                                <Text fontSize="sm" color={textSecondary}>
                                  Tip: Use @username to mention someone
                                </Text>
                                <Button
                                  onClick={postMessage}
                                  isLoading={submitting}
                                  loadingText="Posting..."
                                  colorScheme="blue"
                                  size="md"
                                  leftIcon={<Icon as={ChatBubbleLeftRightIcon} />}
                                  _hover={{ transform: 'translateY(-1px)', shadow: 'lg' }}
                                >
                                  Post Message
                                </Button>
                              </Flex>
                            </VStack>
                          </CardBody>
                        </Card>
                      </VStack>
                    </TabPanel>

                    {/* Dynamic Form Tab */}
                    <TabPanel>
                      <VStack spacing={6} align="stretch">
                        {/* Ticket Type Selector */}
                        <Card bg={cardBg} borderColor={borderColor}>
                          <CardHeader>
                            <Heading size="md" color={textPrimary}>
                              Ticket Type
                            </Heading>
                          </CardHeader>
                          <CardBody>
                            <RadioGroup 
                              value={ticketType} 
                              onChange={setTicketType}
                            >
                              <HStack spacing={6}>
                                <Radio value="user_request" colorScheme="green">
                                  <VStack align="start" spacing={0}>
                                    <Text fontWeight="bold">User Request</Text>
                                    <Text fontSize="sm" color={textSecondary}>General support request</Text>
                                  </VStack>
                                </Radio>
                                <Radio value="order_request" colorScheme="blue">
                                  <VStack align="start" spacing={0}>
                                    <Text fontWeight="bold">Order Request</Text>
                                    <Text fontSize="sm" color={textSecondary}>Purchase or procurement</Text>
                                  </VStack>
                                </Radio>
                                <Radio value="change_request" colorScheme="orange">
                                  <VStack align="start" spacing={0}>
                                    <Text fontWeight="bold">Change Request</Text>
                                    <Text fontSize="sm" color={textSecondary}>System or process change</Text>
                                  </VStack>
                                </Radio>
                              </HStack>
                            </RadioGroup>
                          </CardBody>
                        </Card>

                        {/* Dynamic Form based on ticket type */}
                        {renderDynamicForm()}
                      </VStack>
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              </Card>
            </VStack>

            {/* Right Column - Sidebar */}
            <VStack spacing={6} align="stretch">
              {/* Quick Info Card */}
              <Card bg={cardBg} shadow="lg" borderColor={borderColor}>
                <CardHeader bg="gray.50" borderTopRadius="md">
                  <Heading size="sm" color={textPrimary}>Quick Info</Heading>
                </CardHeader>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <Stat>
                      <StatLabel color={textSecondary}>Assigned To</StatLabel>
                      <StatNumber fontSize="md" color={textPrimary}>
                        {ticket.assignee_name || 'Unassigned'}
                      </StatNumber>
                    </Stat>
                    
                    <Divider />
                    
                    <Stat>
                      <StatLabel color={textSecondary}>Category</StatLabel>
                      <StatNumber fontSize="md" color={textPrimary}>
                        {ticket.category_name || 'No category'}
                      </StatNumber>
                    </Stat>
                    
                    <Divider />
                    
                    <Stat>
                      <StatLabel color={textSecondary}>Last Updated</StatLabel>
                      <StatNumber fontSize="md" color={textPrimary}>
                        {new Date(ticket.updated_at).toLocaleDateString()}
                      </StatNumber>
                      <StatHelpText>
                        {Math.floor((Date.now() - new Date(ticket.updated_at).getTime()) / (1000 * 60 * 60 * 24))} days ago
                      </StatHelpText>
                    </Stat>
                    
                    <Divider />
                    
                    <Stat>
                      <StatLabel color={textSecondary}>Privacy Level</StatLabel>
                      <StatNumber fontSize="md" color={textPrimary}>
                        <Badge colorScheme={ticket.privacy_level === 'public' ? 'green' : 'orange'}>
                          {ticket.privacy_level || 'Public'}
                        </Badge>
                      </StatNumber>
                    </Stat>
                  </VStack>
                </CardBody>
              </Card>

              {/* Quick Actions */}
              <Card bg={cardBg} shadow="lg" borderColor={borderColor}>
                <CardHeader bg="gray.50" borderTopRadius="md">
                  <Heading size="sm" color={textPrimary}>Quick Actions</Heading>
                </CardHeader>
                <CardBody>
                  <VStack spacing={3} align="stretch">
                    {editMode ? (
                      <>
                        <Button 
                          onClick={saveChanges} 
                          isLoading={submitting}
                          colorScheme="green" 
                          size="sm"
                          leftIcon={<Icon as={CheckIcon} />}
                        >
                          Save Changes
                        </Button>
                        <Button 
                          onClick={() => setEditMode(false)} 
                          variant="outline" 
                          size="sm"
                          leftIcon={<Icon as={XMarkIcon} />}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          onClick={() => setEditMode(true)} 
                          colorScheme="blue" 
                          variant="outline" 
                          size="sm"
                          leftIcon={<Icon as={PencilIcon} />}
                        >
                          Edit Ticket
                        </Button>
                        <Button 
                          colorScheme="green" 
                          variant="outline" 
                          size="sm"
                          leftIcon={<Icon as={EyeIcon} />}
                        >
                          Watch Ticket
                        </Button>
                        <Button 
                          colorScheme="orange" 
                          variant="outline" 
                          size="sm"
                          leftIcon={<Icon as={ClockIcon} />}
                        >
                          Set Reminder
                        </Button>
                      </>
                    )}
                  </VStack>
                </CardBody>
              </Card>

              {/* Watchers */}
              <Card bg={cardBg} shadow="lg" borderColor={borderColor}>
                <CardHeader bg="gray.50" borderTopRadius="md">
                  <Heading size="sm" color={textPrimary}>Watchers</Heading>
                </CardHeader>
                <CardBody>
                  <VStack spacing={3}>
                    <Text color={textSecondary} fontSize="sm" textAlign="center">
                      No watchers yet
                    </Text>
                    <Button size="xs" variant="outline" colorScheme="blue">
                      Add Watcher
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </VStack>
          </Grid>
        </Container>
      </Box>
    </AppLayout>
  );
}