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
  Skeleton,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorModeValue,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Progress
} from '@chakra-ui/react';
import { 
  CalendarIcon, 
  UserIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  EyeIcon,
  BuildingOfficeIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChatBubbleLeftRightIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline';

export default function TicketDetailPage() {
  const router = useRouter();
  const toast = useToast();
  const { id } = router.query as { id?: string };
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [typeId, setTypeId] = useState<number | undefined>(undefined);
  const [newMessage, setNewMessage] = useState('');
  const [metadata, setMetadata] = useState<TicketMetadata | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // All color mode hooks at the top
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textPrimary = useColorModeValue('gray.900', 'white');
  const textSecondary = useColorModeValue('gray.600', 'gray.300');
  const emptyStateBg = useColorModeValue('gray.50', 'gray.700');
  const messageBg = useColorModeValue('blue.50', 'blue.900');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [t, msgs, meta] = await Promise.all([
          getTicket(Number(id)),
          getTicketMessages(Number(id)),
          getTicketMetadata()
        ]);
        setTicket(t);
        setTypeId((t as any).type_id ?? undefined);
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
      } catch (e: any) {
        // If we got redirected to login (401), don't toast an error
        if (e?.status !== 401) {
          toast({ status: 'error', title: 'Failed to load ticket', description: e.message });
        }
      }
    })();
  }, [id, toast]);

  const postMessage = async () => {
    if (!newMessage.trim()) return;
    setIsLoading(true);
    try {
      await postTicketMessage(Number(id), { 
        content_format: 'text', 
        body_text: newMessage, 
        body: newMessage,
        message_type: 'comment' 
      });
      setNewMessage('');
      const msgs = await getTicketMessages(Number(id));
      setMessages(msgs);
      toast({ status: 'success', title: 'Message posted successfully' });
    } catch (e: any) {
      console.error('Failed to post message:', e);
      toast({ 
        status: 'error', 
        title: 'Failed to post message', 
        description: e.message || 'An error occurred while posting the message'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateType = async () => {
    if (typeId === undefined) return;
    try {
      await patchTicketType(Number(id), typeId);
      const updatedTicket = await getTicket(Number(id));
      setTicket(updatedTicket);
      toast({ status: 'success', title: 'Ticket type updated' });
    } catch (e: any) {
      toast({ status: 'error', title: 'Failed to update ticket type', description: e.message });
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateTicketFields(Number(id), editValues);
      const updatedTicket = await getTicket(Number(id));
      setTicket(updatedTicket);
      setEditMode(false);
      toast({ status: 'success', title: 'Ticket updated successfully' });
    } catch (e: any) {
      toast({ status: 'error', title: 'Failed to update ticket', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValues({
      summary: ticket.summary,
      description: ticket.description,
      assignee_user_id: ticket.assignee_user_id,
      category_id: ticket.category_id,
      site_id: ticket.site_id,
      status: ticket.status,
      substatus_code: ticket.substatus_code,
      severity: ticket.severity,
      privacy_level: ticket.privacy_level
    });
    setEditMode(false);
  };

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 1: return 'green';
      case 2: return 'yellow';
      case 3: return 'orange';
      case 4: return 'red';
      case 5: return 'purple';
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

  if (!ticket) {
    return (
      <AppLayout>
        <Container maxW="7xl" py={8}>
          <VStack spacing={4} align="center" justify="center" minH="60vh">
            <Skeleton height="40px" width="300px" />
            <Skeleton height="200px" width="100%" />
            <Skeleton height="100px" width="100%" />
          </VStack>
        </Container>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box bg={bgColor} minH="100vh">
        <Container maxW="7xl" py={6}>
          {/* Breadcrumb Navigation */}
          <Breadcrumb mb={6} color={textSecondary} fontSize="sm">
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => router.push('/tickets')} _hover={{ color: 'blue.500' }}>
                Tickets
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink color={textPrimary} fontWeight="semibold">
                #{ticket.ticket_id}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>

          <Grid templateColumns={{ base: "1fr", lg: "1fr 350px" }} gap={6} alignItems="start">
            {/* Main Content */}
            <VStack spacing={6} align="stretch">
              {/* Ticket Header Card */}
              <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
                <CardHeader pb={3}>
                  <Flex justify="space-between" align="flex-start" wrap="wrap" gap={4}>
                    <VStack align="start" spacing={3} flex={1} minW="0">
                      <HStack spacing={3} wrap="wrap">
                        <Heading size="lg" color={textPrimary} wordBreak="break-word">
                          #{ticket.ticket_id}
                        </Heading>
                        {ticket.ticket_no && (
                          <Badge 
                            colorScheme="blue" 
                            variant="subtle" 
                            fontSize="sm" 
                            px={3} 
                            py={1} 
                            borderRadius="full"
                          >
                            {ticket.ticket_no}
                          </Badge>
                        )}
                        <Badge 
                          colorScheme={getSeverityColor(ticket.severity)} 
                          variant="solid"
                          fontSize="sm"
                          px={3}
                          py={1}
                          borderRadius="full"
                        >
                          {getSeverityLabel(ticket.severity)}
                        </Badge>
                      </HStack>
                      
                      {editMode ? (
                        <Input
                          value={editValues.summary}
                          onChange={(e) => setEditValues({...editValues, summary: e.target.value})}
                          fontSize="xl"
                          fontWeight="600"
                          color={textPrimary}
                          bg="white"
                          borderColor="gray.300"
                          _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                          size="lg"
                        />
                      ) : (
                        <Heading 
                          size="md" 
                          color={textPrimary} 
                          fontWeight="600" 
                          lineHeight="1.4"
                          wordBreak="break-word"
                        >
                          {ticket.summary}
                        </Heading>
                      )}
                    </VStack>

                    <HStack spacing={2} flexShrink={0}>
                      {editMode ? (
                        <>
                          <Button
                            size="sm"
                            colorScheme="green"
                            leftIcon={<CheckIcon className="w-4 h-4" />}
                            onClick={handleSave}
                            isLoading={isLoading}
                            loadingText="Saving"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<XMarkIcon className="w-4 h-4" />}
                            onClick={handleCancel}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          colorScheme="blue"
                          variant="outline"
                          leftIcon={<PencilIcon className="w-4 h-4" />}
                          onClick={() => setEditMode(true)}
                        >
                          Edit
                        </Button>
                      )}
                    </HStack>
                  </Flex>
                </CardHeader>

                <CardBody pt={0}>
                  <Tabs variant="line" colorScheme="blue" size="md">
                    <TabList borderBottomColor={borderColor}>
                      <Tab fontWeight="600" _selected={{ color: 'blue.500', borderColor: 'blue.500' }}>
                        Details
                      </Tab>
                      <Tab fontWeight="600" _selected={{ color: 'blue.500', borderColor: 'blue.500' }}>
                        <HStack spacing={2}>
                          <ChatBubbleLeftRightIcon className="w-4 h-4" />
                          <Text>Activity</Text>
                          {messages.length > 0 && (
                            <Badge colorScheme="gray" variant="subtle" fontSize="xs">
                              {messages.length}
                            </Badge>
                          )}
                        </HStack>
                      </Tab>
                      <Tab fontWeight="600" _selected={{ color: 'blue.500', borderColor: 'blue.500' }}>
                        <HStack spacing={2}>
                          <PaperClipIcon className="w-4 h-4" />
                          <Text>Assets</Text>
                        </HStack>
                      </Tab>
                    </TabList>

                    <TabPanels>
                      {/* Details Tab */}
                      <TabPanel px={0} py={6}>
                        <VStack spacing={6} align="stretch">
                          {/* Description */}
                          <Box>
                            <Text fontWeight="600" color={textPrimary} mb={3} fontSize="sm" textTransform="uppercase" letterSpacing="wide">
                              Description
                            </Text>
                            {editMode ? (
                              <Textarea
                                value={editValues.description}
                                onChange={(e) => setEditValues({...editValues, description: e.target.value})}
                                minH="120px"
                                bg="white"
                                borderColor="gray.300"
                                _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                                resize="vertical"
                                placeholder="Enter ticket description..."
                              />
                            ) : (
                              <Box
                                p={4}
                                bg={emptyStateBg}
                                borderRadius="md"
                                border="1px"
                                borderColor={borderColor}
                                minH="100px"
                              >
                                <Text color={textPrimary} lineHeight="1.6" whiteSpace="pre-wrap">
                                  {ticket.description || 'No description provided'}
                                </Text>
                              </Box>
                            )}
                          </Box>

                          {/* Custom Fields Grid */}
                          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                            <FormControl>
                              <FormLabel fontSize="sm" fontWeight="600" color={textSecondary} textTransform="uppercase" letterSpacing="wide">
                                Status
                              </FormLabel>
                              {editMode ? (
                                <Select 
                                  value={editValues.status} 
                                  onChange={(e) => setEditValues({...editValues, status: e.target.value})}
                                  bg="white"
                                  borderColor="gray.300"
                                  _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                                >
                                  {metadata?.statuses.map(status => (
                                    <option key={status.status_code} value={status.status_code}>{status.status_name}</option>
                                  ))}
                                </Select>
                              ) : (
                                <Text fontSize="md" color={textPrimary} fontWeight="500">
                                  {ticket.status}
                                </Text>
                              )}
                            </FormControl>

                            <FormControl>
                              <FormLabel fontSize="sm" fontWeight="600" color={textSecondary} textTransform="uppercase" letterSpacing="wide">
                                Assignee
                              </FormLabel>
                              {editMode ? (
                                <Select 
                                  value={editValues.assignee_user_id || ''} 
                                  onChange={(e) => setEditValues({...editValues, assignee_user_id: e.target.value ? Number(e.target.value) : null})}
                                  bg="white"
                                  borderColor="gray.300"
                                  _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                                >
                                  <option value="">Unassigned</option>
                                  {metadata?.users.map(user => (
                                    <option key={user.user_id} value={user.user_id}>{user.name}</option>
                                  ))}
                                </Select>
                              ) : (
                                <HStack>
                                  <Avatar size="sm" name={ticket.assignee_display_name || 'Unassigned'} />
                                  <Text fontSize="md" color={textPrimary} fontWeight="500">
                                    {ticket.assignee_display_name || 'Unassigned'}
                                  </Text>
                                </HStack>
                              )}
                            </FormControl>

                            <FormControl>
                              <FormLabel fontSize="sm" fontWeight="600" color={textSecondary} textTransform="uppercase" letterSpacing="wide">
                                Category
                              </FormLabel>
                              {editMode ? (
                                <Select 
                                  value={editValues.category_id || ''} 
                                  onChange={(e) => setEditValues({...editValues, category_id: e.target.value ? Number(e.target.value) : null})}
                                  bg="white"
                                  borderColor="gray.300"
                                  _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                                >
                                  <option value="">No category</option>
                                  {metadata?.categories.map(category => (
                                    <option key={category.category_id} value={category.category_id}>{category.name}</option>
                                  ))}
                                </Select>
                              ) : (
                                <Text fontSize="md" color={textPrimary} fontWeight="500">
                                  {ticket.category_name || 'No category'}
                                </Text>
                              )}
                            </FormControl>

                            <FormControl>
                              <FormLabel fontSize="sm" fontWeight="600" color={textSecondary} textTransform="uppercase" letterSpacing="wide">
                                Site
                              </FormLabel>
                              {editMode ? (
                                <Select 
                                  value={editValues.site_id || ''} 
                                  onChange={(e) => setEditValues({...editValues, site_id: e.target.value ? Number(e.target.value) : null})}
                                  bg="white"
                                  borderColor="gray.300"
                                  _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                                >
                                  <option value="">No site</option>
                                  {metadata?.sites.map(site => (
                                    <option key={site.site_id} value={site.site_id}>{site.name}</option>
                                  ))}
                                </Select>
                              ) : (
                                <HStack>
                                  <Icon as={BuildingOfficeIcon} w={4} h={4} color="gray.500" />
                                  <Text fontSize="md" color={textPrimary} fontWeight="500">
                                    {ticket.site_name || 'No site'}
                                  </Text>
                                </HStack>
                              )}
                            </FormControl>

                            <FormControl>
                              <FormLabel fontSize="sm" fontWeight="600" color={textSecondary} textTransform="uppercase" letterSpacing="wide">
                                Severity
                              </FormLabel>
                              {editMode ? (
                                <NumberInput 
                                  value={editValues.severity} 
                                  onChange={(valueString, valueNumber) => setEditValues({...editValues, severity: valueNumber})}
                                  min={1} 
                                  max={5}
                                  bg="white"
                                >
                                  <NumberInputField borderColor="gray.300" _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }} />
                                  <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                  </NumberInputStepper>
                                </NumberInput>
                              ) : (
                                <HStack>
                                  <Badge colorScheme={getSeverityColor(ticket.severity)} variant="solid">
                                    {getSeverityLabel(ticket.severity)}
                                  </Badge>
                                  <Text fontSize="sm" color={textSecondary}>
                                    Level {ticket.severity}/5
                                  </Text>
                                </HStack>
                              )}
                            </FormControl>

                            <FormControl>
                              <FormLabel fontSize="sm" fontWeight="600" color={textSecondary} textTransform="uppercase" letterSpacing="wide">
                                Privacy Level
                              </FormLabel>
                              {editMode ? (
                                <Select 
                                  value={editValues.privacy_level || ''} 
                                  onChange={(e) => setEditValues({...editValues, privacy_level: e.target.value})}
                                  bg="white"
                                  borderColor="gray.300"
                                  _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                                >
                                  <option value="public">Public</option>
                                  <option value="internal">Internal</option>
                                  <option value="private">Private</option>
                                </Select>
                              ) : (
                                <HStack>
                                  <Icon as={EyeIcon} w={4} h={4} color="gray.500" />
                                  <Text fontSize="md" color={textPrimary} fontWeight="500" textTransform="capitalize">
                                    {ticket.privacy_level || 'Public'}
                                  </Text>
                                </HStack>
                              )}
                            </FormControl>
                          </SimpleGrid>
                        </VStack>
                      </TabPanel>

                      {/* Activity Tab */}
                      <TabPanel px={0} py={6}>
                        <VStack spacing={6} align="stretch">
                          {/* New Message Input */}
                          <Card bg={messageBg} borderColor="blue.200">
                            <CardBody>
                              <VStack spacing={4} align="stretch">
                                <Text fontWeight="600" color={textPrimary} fontSize="sm" textTransform="uppercase" letterSpacing="wide">
                                  Add Comment
                                </Text>
                                <Textarea
                                  value={newMessage}
                                  onChange={(e) => setNewMessage(e.target.value)}
                                  placeholder="Type your message here..."
                                  minH="100px"
                                  bg="white"
                                  borderColor="gray.300"
                                  _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                                  resize="vertical"
                                />
                                <Flex justify="space-between" align="center">
                                  <Text fontSize="sm" color={textSecondary}>
                                    Supports plain text formatting
                                  </Text>
                                  <Button
                                    onClick={postMessage}
                                    colorScheme="blue"
                                    size="sm"
                                    isDisabled={!newMessage.trim()}
                                    isLoading={isLoading}
                                    loadingText="Posting..."
                                  >
                                    Post Comment
                                  </Button>
                                </Flex>
                              </VStack>
                            </CardBody>
                          </Card>

                          {/* Messages List */}
                          {messages.length === 0 ? (
                            <Box
                              p={8}
                              textAlign="center"
                              bg={emptyStateBg}
                              borderRadius="md"
                              border="1px dashed"
                              borderColor={borderColor}
                            >
                              <Text color={textSecondary} fontSize="lg">
                                No comments yet
                              </Text>
                              <Text color={textSecondary} fontSize="sm" mt={2}>
                                Be the first to add a comment to this ticket
                              </Text>
                            </Box>
                          ) : (
                            <VStack spacing={4} align="stretch">
                              {messages.map((message, index) => (
                                <Card
                                  key={message.message_id || index}
                                  bg={cardBg}
                                  borderWidth="1px"
                                  borderColor={borderColor}
                                  _hover={{ shadow: "md" }}
                                  transition="all 0.2s"
                                >
                                  <CardBody>
                                    <Flex gap={4}>
                                      <Avatar 
                                        size="sm" 
                                        name={message.created_by_display_name || 'System'} 
                                        flexShrink={0}
                                      />
                                      <VStack align="start" spacing={2} flex={1} minW="0">
                                        <Flex justify="space-between" align="center" w="full">
                                          <Text fontWeight="600" color={textPrimary} fontSize="sm">
                                            {message.created_by_display_name || 'System'}
                                          </Text>
                                          <Text fontSize="xs" color={textSecondary}>
                                            {new Date(message.created_at).toLocaleString()}
                                          </Text>
                                        </Flex>
                                        <Text 
                                          color={textPrimary} 
                                          lineHeight="1.6" 
                                          whiteSpace="pre-wrap"
                                          wordBreak="break-word"
                                        >
                                          {message.body_text || message.body || 'No content'}
                                        </Text>
                                      </VStack>
                                    </Flex>
                                  </CardBody>
                                </Card>
                              ))}
                            </VStack>
                          )}
                        </VStack>
                      </TabPanel>

                      {/* Assets Tab */}
                      <TabPanel px={0} py={6}>
                        <VStack spacing={4} align="stretch">
                          {ticket.asset_name ? (
                            <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                              <CardBody>
                                <HStack spacing={4}>
                                  <Box
                                    w={12}
                                    h={12}
                                    bg="blue.100"
                                    borderRadius="md"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                  >
                                    <Icon as={BuildingOfficeIcon} w={6} h={6} color="blue.600" />
                                  </Box>
                                  <VStack align="start" spacing={1} flex={1}>
                                    <Text fontWeight="600" color={textPrimary}>
                                      {ticket.asset_name}
                                    </Text>
                                    <Text fontSize="sm" color={textSecondary}>
                                      {ticket.asset_type} • Zone: {ticket.zone_label || 'Unknown'}
                                    </Text>
                                  </VStack>
                                </HStack>
                              </CardBody>
                            </Card>
                          ) : (
                            <Box
                              p={8}
                              textAlign="center"
                              bg={emptyStateBg}
                              borderRadius="md"
                              border="1px dashed"
                              borderColor={borderColor}
                            >
                              <Text color={textSecondary} fontSize="lg">
                                No assets linked
                              </Text>
                              <Text color={textSecondary} fontSize="sm" mt={2}>
                                This ticket is not associated with any specific asset
                              </Text>
                            </Box>
                          )}
                        </VStack>
                      </TabPanel>
                    </TabPanels>
                  </Tabs>
                </CardBody>
              </Card>
            </VStack>

            {/* Sidebar */}
            <VStack spacing={4} align="stretch">
              {/* Quick Info Card */}
              <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
                <CardHeader pb={3}>
                  <Text fontWeight="600" color={textPrimary} fontSize="sm" textTransform="uppercase" letterSpacing="wide">
                    Quick Info
                  </Text>
                </CardHeader>
                <CardBody pt={0}>
                  <VStack spacing={4} align="stretch">
                    <Flex justify="space-between" align="center">
                      <Text fontSize="sm" color={textSecondary}>Created</Text>
                      <VStack align="end" spacing={0}>
                        <Text fontSize="sm" color={textPrimary} fontWeight="500">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </Text>
                        <Text fontSize="xs" color={textSecondary}>
                          {new Date(ticket.created_at).toLocaleTimeString()}
                        </Text>
                      </VStack>
                    </Flex>
                    
                    <Flex justify="space-between" align="center">
                      <Text fontSize="sm" color={textSecondary}>Updated</Text>
                      <VStack align="end" spacing={0}>
                        <Text fontSize="sm" color={textPrimary} fontWeight="500">
                          {new Date(ticket.updated_at).toLocaleDateString()}
                        </Text>
                        <Text fontSize="xs" color={textSecondary}>
                          {new Date(ticket.updated_at).toLocaleTimeString()}
                        </Text>
                      </VStack>
                    </Flex>

                    <Flex justify="space-between" align="center">
                      <Text fontSize="sm" color={textSecondary}>Reporter</Text>
                      <HStack>
                        <Avatar size="xs" name={ticket.created_by_display_name || 'System'} />
                        <Text fontSize="sm" color={textPrimary} fontWeight="500">
                          {ticket.created_by_display_name || 'System'}
                        </Text>
                      </HStack>
                    </Flex>

                    <Divider />

                    <Progress 
                      value={ticket.status === 'Closed' ? 100 : ticket.status === 'InProgress' ? 75 : 25} 
                      colorScheme="blue" 
                      size="sm" 
                      borderRadius="full"
                    />
                    <Text fontSize="xs" color={textSecondary} textAlign="center">
                      Ticket Progress
                    </Text>
                  </VStack>
                </CardBody>
              </Card>

              {/* Actions Card */}
              <Card bg={cardBg} shadow="sm" borderWidth="1px" borderColor={borderColor}>
                <CardHeader pb={3}>
                  <Text fontWeight="600" color={textPrimary} fontSize="sm" textTransform="uppercase" letterSpacing="wide">
                    Actions
                  </Text>
                </CardHeader>
                <CardBody pt={0}>
                  <VStack spacing={3} align="stretch">
                    <Menu>
                      <MenuButton as={Button} size="sm" variant="outline" w="full" rightIcon={<ChevronDownIcon className="w-4 h-4" />}>
                        Change Status
                      </MenuButton>
                      <MenuList>
                        <MenuItem>Mark as In Progress</MenuItem>
                        <MenuItem>Mark as Resolved</MenuItem>
                        <MenuItem>Mark as Closed</MenuItem>
                        <MenuItem color="red.500">Mark as Cancelled</MenuItem>
                      </MenuList>
                    </Menu>
                    
                    <Button size="sm" variant="outline" w="full">
                      Add to Watchlist
                    </Button>
                    
                    <Button size="sm" variant="outline" w="full">
                      Export Ticket
                    </Button>
                    
                    <Divider />
                    
                    <Button size="sm" colorScheme="red" variant="outline" w="full">
                      Delete Ticket
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