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
  useDisclosure
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
  XMarkIcon
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
  const editorRef = useRef<HTMLDivElement>(null);

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
      toast({ status: 'success', title: 'Message posted' });
    } catch (e: any) {
      toast({ status: 'error', title: 'Failed to post message', description: e.message });
    }
  };

  const updateType = async () => {
    if (!typeId) return;
    try {
      await patchTicketType(Number(id), Number(typeId));
      toast({ status: 'success', title: 'Type updated' });
    } catch (e: any) {
      toast({ status: 'error', title: 'Failed to update type', description: e.message });
    }
  };

  const saveChanges = async () => {
    try {
      await updateTicketFields(Number(id), editValues);
      // Refresh ticket data
      const updatedTicket = await getTicket(Number(id));
      setTicket(updatedTicket);
      setEditMode(false);
      toast({ status: 'success', title: 'Ticket updated successfully' });
    } catch (e: any) {
      toast({ status: 'error', title: 'Failed to update ticket', description: e.message });
    }
  };

  const cancelEdit = () => {
    if (!ticket) return;
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
        <Box p={8} bg="white" minH="100vh">
          <Text color="gray.900">Loading ticket...</Text>
        </Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box p={6} bg="gray.50" minH="100vh">
        <VStack align="stretch" spacing={6} maxW="7xl" mx="auto">
          {/* Header */}
          <Card bg="white" shadow="lg">
            <CardHeader>
              <Flex justify="space-between" align="center">
                <VStack align="start" spacing={2} flex={1}>
                  <HStack>
                    <Heading size="lg" color="gray.900">Ticket #{ticket.ticket_id}</Heading>
                    {ticket.ticket_no && (
                      <Badge colorScheme="blue" variant="subtle">{ticket.ticket_no}</Badge>
                    )}
                  </HStack>
                  {editMode ? (
                    <Input
                      value={editValues.summary}
                      onChange={(e) => setEditValues({...editValues, summary: e.target.value})}
                      fontSize="xl"
                      fontWeight="semibold"
                      color="gray.800"
                      bg="white"
                      borderColor="gray.300"
                    />
                  ) : (
                    <Text fontSize="xl" fontWeight="semibold" color="gray.800">
                      {ticket.summary}
                    </Text>
                  )}
                </VStack>
                <VStack align="end" spacing={2}>
                  <HStack>
                    {editMode ? (
                      <>
                        <IconButton
                          aria-label="Save changes"
                          icon={<CheckIcon />}
                          colorScheme="green"
                          size="sm"
                          onClick={saveChanges}
                        />
                        <IconButton
                          aria-label="Cancel edit"
                          icon={<XMarkIcon />}
                          colorScheme="red"
                          size="sm"
                          onClick={cancelEdit}
                        />
                      </>
                    ) : (
                      <IconButton
                        aria-label="Edit ticket"
                        icon={<PencilIcon />}
                        colorScheme="blue"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditMode(true)}
                      />
                    )}
                  </HStack>
                  {editMode ? (
                    <NumberInput
                      value={editValues.severity}
                      onChange={(value) => setEditValues({...editValues, severity: Number(value)})}
                      min={1}
                      max={5}
                      size="sm"
                      maxW="100px"
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  ) : (
                    <Badge 
                      colorScheme={getSeverityColor(ticket.severity)} 
                      variant="solid" 
                      px={3} 
                      py={1}
                      fontSize="sm"
                    >
                      {getSeverityLabel(ticket.severity)} Priority
                    </Badge>
                  )}
                  {editMode ? (
                    <Select
                      value={editValues.status}
                      onChange={(e) => setEditValues({...editValues, status: e.target.value})}
                      size="sm"
                      maxW="150px"
                      bg="white"
                    >
                      {metadata?.statuses.map(status => (
                        <option key={status.status_code} value={status.status_code}>
                          {status.status_name}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Badge colorScheme="blue" variant="outline">
                      {ticket.status}
                    </Badge>
                  )}
                </VStack>
              </Flex>
            </CardHeader>
          </Card>

          <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={6}>
            {/* Main Content */}
            <VStack align="stretch" spacing={6}>
              {/* Description */}
              <Card bg="white" shadow="md">
                <CardHeader>
                  <Heading size="md" color="gray.900">Description</Heading>
                </CardHeader>
                <CardBody>
                  {editMode ? (
                    <Textarea
                      value={editValues.description || ''}
                      onChange={(e) => setEditValues({...editValues, description: e.target.value})}
                      placeholder="Enter description..."
                      rows={6}
                      bg="white"
                      color="gray.900"
                      borderColor="gray.300"
                    />
                  ) : (
                    <Text color="gray.700" whiteSpace="pre-wrap">
                      {ticket.description || 'No description provided'}
                    </Text>
                  )}
                  {ticket.problem_description && (
                    <>
                      <Divider my={4} />
                      <Text fontWeight="semibold" color="gray.900" mb={2}>Problem Details:</Text>
                      <Text color="gray.700" whiteSpace="pre-wrap">
                        {ticket.problem_description}
                      </Text>
                    </>
                  )}
                </CardBody>
              </Card>

              {/* Messages */}
              <Card bg="white" shadow="md">
                <CardHeader>
                  <Heading size="md" color="gray.900">Messages ({messages.length})</Heading>
                </CardHeader>
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    {messages.length === 0 ? (
                      <Text color="gray.500" textAlign="center" py={8}>
                        No messages yet
                      </Text>
                    ) : (
                      messages.map((message, index) => (
                        <Box key={message.comment_id || index} p={4} bg="gray.50" rounded="md" borderLeft="4px" borderColor="blue.400">
                          <Flex justify="space-between" align="start" mb={2}>
                            <HStack>
                              <Avatar size="sm" name={message.created_by_name || 'Unknown'} />
                              <VStack align="start" spacing={0}>
                                <Text fontWeight="semibold" color="gray.900" fontSize="sm">
                                  {message.created_by_name || 'Unknown User'}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  {new Date(message.created_at).toLocaleString()}
                                </Text>
                              </VStack>
                            </HStack>
                            <Badge variant="outline" fontSize="xs">
                              {message.message_type || 'comment'}
                            </Badge>
                          </Flex>
                          {message.content_format === 'html' ? (
                            <Box dangerouslySetInnerHTML={{ __html: message.body_html || '' }} color="gray.800" />
                          ) : (
                            <Text whiteSpace="pre-wrap" color="gray.800">
                              {message.body_text || message.body || 'Empty message'}
                            </Text>
                          )}
                        </Box>
                      ))
                    )}
                  </VStack>
                </CardBody>
              </Card>

              {/* Add Message */}
              <Card bg="white" shadow="md">
                <CardHeader>
                  <Heading size="md" color="gray.900">Add Message</Heading>
                </CardHeader>
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message here..."
                      rows={4}
                      bg="white"
                      color="gray.900"
                      borderColor="gray.300"
                      _focus={{ borderColor: 'blue.400' }}
                    />
                    <HStack justify="end">
                      <Button 
                        onClick={postMessage} 
                        colorScheme="blue"
                        isDisabled={!newMessage.trim()}
                      >
                        Post Message
                      </Button>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            </VStack>

            {/* Sidebar */}
            <VStack align="stretch" spacing={6}>
              {/* Ticket Details */}
              <Card bg="white" shadow="md">
                <CardHeader>
                  <Heading size="md" color="gray.900">Ticket Details</Heading>
                </CardHeader>
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    <Box>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={1}>
                        <Icon as={BuildingOfficeIcon} w={4} h={4} mr={2} />
                        Site
                      </Text>
                      {editMode ? (
                        <Select
                          value={editValues.site_id || ''}
                          onChange={(e) => setEditValues({...editValues, site_id: Number(e.target.value)})}
                          bg="white"
                          color="gray.900"
                        >
                          {metadata?.sites.map(site => (
                            <option key={site.site_id} value={site.site_id}>
                              {site.display_name || site.name}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Text color="gray.900">{ticket.site_name || `Site ${ticket.site_id}`}</Text>
                      )}
                    </Box>

                    <Box>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={1}>
                        <Icon as={UserIcon} w={4} h={4} mr={2} />
                        Assigned To
                      </Text>
                      {editMode ? (
                        <Select
                          value={editValues.assignee_user_id || ''}
                          onChange={(e) => setEditValues({...editValues, assignee_user_id: e.target.value ? Number(e.target.value) : null})}
                          bg="white"
                          color="gray.900"
                        >
                          <option value="">Unassigned</option>
                          {metadata?.users.map(user => (
                            <option key={user.user_id} value={user.user_id}>
                              {user.name}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Text color="gray.900">{ticket.assignee_name || 'Unassigned'}</Text>
                      )}
                    </Box>

                    <Box>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={1}>
                        Category
                      </Text>
                      {editMode ? (
                        <Select
                          value={editValues.category_id || ''}
                          onChange={(e) => setEditValues({...editValues, category_id: e.target.value ? Number(e.target.value) : null})}
                          bg="white"
                          color="gray.900"
                        >
                          <option value="">No category</option>
                          {metadata?.categories.map(category => (
                            <option key={category.category_id} value={category.category_id}>
                              {category.name}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Text color="gray.900">{ticket.category_name || 'No category'}</Text>
                      )}
                    </Box>

                    <Box>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={1}>
                        Status Details
                      </Text>
                      {editMode ? (
                        <VStack align="stretch" spacing={2}>
                          <Select
                            value={editValues.status || ''}
                            onChange={(e) => setEditValues({...editValues, status: e.target.value})}
                            bg="white"
                            color="gray.900"
                          >
                            {metadata?.statuses.map(status => (
                              <option key={status.status_code} value={status.status_code}>
                                {status.status_name}
                              </option>
                            ))}
                          </Select>
                          <Select
                            value={editValues.substatus_code || ''}
                            onChange={(e) => setEditValues({...editValues, substatus_code: e.target.value})}
                            bg="white"
                            color="gray.900"
                          >
                            <option value="">No substatus</option>
                            {metadata?.substatuses
                              .filter(sub => sub.status_code === editValues.status)
                              .map(substatus => (
                                <option key={substatus.substatus_code} value={substatus.substatus_code}>
                                  {substatus.substatus_name}
                                </option>
                              ))}
                          </Select>
                        </VStack>
                      ) : (
                        <VStack align="start" spacing={1}>
                          <Text color="gray.900">{ticket.status}</Text>
                          {ticket.substatus_name && (
                            <Badge variant="outline" size="sm">{ticket.substatus_name}</Badge>
                          )}
                        </VStack>
                      )}
                    </Box>

                    <Box>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={1}>
                        <Icon as={EyeIcon} w={4} h={4} mr={2} />
                        Privacy
                      </Text>
                      {editMode ? (
                        <Select
                          value={editValues.privacy_level || 'public'}
                          onChange={(e) => setEditValues({...editValues, privacy_level: e.target.value})}
                          bg="white"
                          color="gray.900"
                        >
                          <option value="public">Public</option>
                          <option value="site_only">Site Only</option>
                          <option value="private">Private</option>
                        </Select>
                      ) : (
                        <Badge 
                          colorScheme={ticket.privacy_level === 'public' ? 'green' : ticket.privacy_level === 'private' ? 'red' : 'blue'}
                          variant="subtle"
                        >
                          {ticket.privacy_level || 'public'}
                        </Badge>
                      )}
                    </Box>

                    <Divider />

                    <Box>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={1}>
                        <Icon as={CalendarIcon} w={4} h={4} mr={2} />
                        Created
                      </Text>
                      <Text color="gray.900" fontSize="sm">
                        {new Date(ticket.created_at).toLocaleString()}
                      </Text>
                      <Text color="gray.500" fontSize="xs">
                        by {ticket.created_by_name || 'Unknown'}
                      </Text>
                    </Box>

                    <Box>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={1}>
                        <Icon as={ClockIcon} w={4} h={4} mr={2} />
                        Last Updated
                      </Text>
                      <Text color="gray.900" fontSize="sm">
                        {new Date(ticket.updated_at).toLocaleString()}
                      </Text>
                    </Box>
                  </VStack>
                </CardBody>
              </Card>

              {/* Contact Information */}
              {(ticket.contact_name || ticket.contact_email || ticket.contact_phone) && (
                <Card bg="white" shadow="md">
                  <CardHeader>
                    <Heading size="md" color="gray.900">Contact Information</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      {ticket.contact_name && (
                        <Box>
                          <Text fontSize="sm" fontWeight="semibold" color="gray.600">Name</Text>
                          <Text color="gray.900">{ticket.contact_name}</Text>
                        </Box>
                      )}
                      {ticket.contact_email && (
                        <Box>
                          <Text fontSize="sm" fontWeight="semibold" color="gray.600">Email</Text>
                          <Text color="gray.900">{ticket.contact_email}</Text>
                        </Box>
                      )}
                      {ticket.contact_phone && (
                        <Box>
                          <Text fontSize="sm" fontWeight="semibold" color="gray.600">Phone</Text>
                          <Text color="gray.900">{ticket.contact_phone}</Text>
                        </Box>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              )}

              {/* Watchers */}
              <Card bg="white" shadow="md">
                <CardHeader>
                  <Heading size="md" color="gray.900">
                    Watchers ({(ticket.watcher_count || 0) + (ticket.collaborator_count || 0)})
                  </Heading>
                </CardHeader>
                <CardBody>
                  <VStack align="stretch" spacing={3}>
                    {ticket.watchers && ticket.watchers.length > 0 ? (
                      ticket.watchers.map((watcher: any, index: number) => (
                        <HStack key={watcher.user_id || index} spacing={3}>
                          <Avatar size="sm" name={watcher.user_name || 'Unknown'} />
                          <VStack align="start" spacing={0} flex={1}>
                            <Text fontWeight="semibold" color="gray.900" fontSize="sm">
                              {watcher.user_name || 'Unknown User'}
                            </Text>
                            <Badge 
                              size="xs" 
                              colorScheme={watcher.watcher_type === 'collaborator' ? 'green' : 'blue'}
                              variant="subtle"
                            >
                              {watcher.watcher_type || 'watcher'}
                            </Badge>
                          </VStack>
                        </HStack>
                      ))
                    ) : (
                      <VStack align="stretch" spacing={2}>
                        {ticket.watcher_count > 0 && (
                          <HStack>
                            <Badge colorScheme="blue" variant="outline">
                              {ticket.watcher_count} Watchers
                            </Badge>
                          </HStack>
                        )}
                        {ticket.collaborator_count > 0 && (
                          <HStack>
                            <Badge colorScheme="green" variant="outline">
                              {ticket.collaborator_count} Collaborators
                            </Badge>
                          </HStack>
                        )}
                        {(!ticket.watcher_count && !ticket.collaborator_count) && (
                          <Text color="gray.500" fontSize="sm">No watchers</Text>
                        )}
                      </VStack>
                    )}
                  </VStack>
                </CardBody>
              </Card>

              {/* Quick Actions */}
              <Card bg="white" shadow="md">
                <CardHeader>
                  <Heading size="md" color="gray.900">Quick Actions</Heading>
                </CardHeader>
                <CardBody>
                  <VStack align="stretch" spacing={3}>
                    <Box>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={2}>
                        Change Type
                      </Text>
                      <VStack spacing={2}>
                        <Select 
                          value={typeId ?? ''} 
                          placeholder="Select type" 
                          onChange={(e) => setTypeId(Number(e.target.value))}
                          bg="white"
                          color="gray.900"
                        >
                          <option value="1">Help Request</option>
                          <option value="2">User Change Request</option>
                          <option value="3">Purchase Request</option>
                          <option value="4">Vendor Service Request</option>
                        </Select>
                        <Button onClick={updateType} size="sm" colorScheme="blue" w="full">
                          Update Type
                        </Button>
                      </VStack>
                    </Box>
                  </VStack>
                </CardBody>
              </Card>

              {/* Associated Assets */}
              {ticket.assets && ticket.assets.length > 0 && (
                <Card bg="white" shadow="md">
                  <CardHeader>
                    <Heading size="md" color="gray.900">
                      Associated Assets ({ticket.assets.length})
                    </Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      {ticket.assets.map((asset: any, index: number) => (
                        <Box key={asset.asset_id || index} p={4} bg="gray.50" rounded="md" borderWidth="1px" borderColor="gray.200">
                          <VStack align="stretch" spacing={2}>
                            <Flex justify="space-between" align="center">
                              <Text fontWeight="semibold" color="gray.900">{asset.type}</Text>
                              <Badge variant="outline" colorScheme="blue">#{asset.asset_id}</Badge>
                            </Flex>
                            {asset.model && (
                              <Text color="gray.700" fontSize="sm">
                                <strong>Model:</strong> {asset.model}
                              </Text>
                            )}
                            {asset.vendor && (
                              <Text color="gray.700" fontSize="sm">
                                <strong>Vendor:</strong> {asset.vendor}
                              </Text>
                            )}
                            {asset.serial && (
                              <Text color="gray.700" fontSize="sm">
                                <strong>Serial:</strong> {asset.serial}
                              </Text>
                            )}
                            {asset.location && (
                              <Text color="gray.700" fontSize="sm">
                                <strong>Location:</strong> {asset.location}
                              </Text>
                            )}
                            {asset.installed_at && (
                              <Text color="gray.500" fontSize="xs">
                                Installed: {new Date(asset.installed_at).toLocaleDateString()}
                              </Text>
                            )}
                            {asset.warranty_until && (
                              <Text 
                                color={new Date(asset.warranty_until) > new Date() ? "green.600" : "red.600"} 
                                fontSize="xs"
                                fontWeight="semibold"
                              >
                                Warranty: {new Date(asset.warranty_until) > new Date() ? 'Active' : 'Expired'} 
                                ({new Date(asset.warranty_until).toLocaleDateString()})
                              </Text>
                            )}
                          </VStack>
                        </Box>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>
              )}
            </VStack>
          </Grid>
        </VStack>
      </Box>
    </AppLayout>
  );
}
