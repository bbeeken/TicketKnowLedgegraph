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
  getTicketWatchers,
  addTicketWatcher,
  removeTicketWatcher,
  uploadTicketAttachment,
  type TicketMetadata,
  type TicketWatcher
} from '@/lib/api/tickets';
import { getVendors, upsertVendorServiceRequest, type Vendor } from '@/lib/api/vendors';
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
  Textarea,
  Icon,
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
  Container,
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
  Tooltip,
  Center,
  Spinner,
  Radio,
  RadioGroup,
  Checkbox,
  CheckboxGroup
} from '@chakra-ui/react';
import { Select as ChakraSelect } from 'chakra-react-select';

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
import { useAuth } from '@/components/auth/AuthProvider';

export default function TicketDetailPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = router.query;
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [metadata, setMetadata] = useState<TicketMetadata | null>(null);
  const [editMode, setEditMode] = useState(true);
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
  const [typeId, setTypeId] = useState<number | undefined>(undefined);
  const [watchers, setWatchers] = useState<TicketWatcher[]>([]);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [addWatcherOpen, setAddWatcherOpen] = useState<boolean>(false);
  const [newWatcher, setNewWatcher] = useState<{ user_id?: number | null; name?: string; email?: string; watcher_type?: 'interested' | 'collaborator' | 'site_contact' | 'assignee_backup'; }>({ watcher_type: 'interested' });
  const [siteContactUserId, setSiteContactUserId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vsrForm, setVsrForm] = useState<{ vendor_id: number | null; request_type: string; status: string; notes: string }>({ vendor_id: null, request_type: '', status: 'open', notes: '' });
  const [quickSaving, setQuickSaving] = useState<Record<string, boolean>>({});

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
        // Load watchers list
        try {
          const ws = await getTicketWatchers(Number(id));
          setWatchers(ws);
          const sc = ws.find(w => w.watcher_type === 'site_contact' && w.user_id);
          if (sc?.user_id) setSiteContactUserId(sc.user_id);
        } catch (e: any) {
          console.warn('Failed to load watchers:', e?.message || e);
        }
        setEditValues({
          summary: t.summary,
          description: t.description,
          assignee_user_id: t.assignee_user_id,
          category_id: t.category_id,
          site_id: t.site_id,
          status: t.status,
          substatus_code: t.substatus_code,
          severity: t.severity,
          privacy_level: t.privacy_level,
          contact_name: t.contact_name ?? '',
          contact_email: t.contact_email ?? '',
          contact_phone: t.contact_phone ?? '',
          problem_description: t.problem_description ?? ''
        });
        // Capture type id/name when available
        setTypeId((t as any).type_id ?? undefined);

        // Infer ticket type using metadata types where possible
        const tn = ((t as any).type_name as string | undefined)?.toLowerCase();
        const tid = (t as any).type_id as number | undefined;
        const types = (meta as any)?.types as Array<{ type_id: number; type_name: string }> | undefined;
        if (tid && types && types.length > 0) {
          const match = types.find(x => x.type_id === tid);
          const name = match?.type_name?.toLowerCase() || tn || '';
          if (name.includes('order') || name.includes('purchase')) setTicketType('order_request');
          else if (name.includes('change')) setTicketType('change_request');
          else setTicketType('user_request');
        } else if (tn) {
          if (tn.includes('order') || tn.includes('purchase')) setTicketType('order_request');
          else if (tn.includes('change')) setTicketType('change_request');
          else setTicketType('user_request');
        } else if (t.category_name?.toLowerCase().includes('order')) {
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
    // Load vendors list for VSR
    (async () => {
      try {
        const list = await getVendors();
        setVendors(list);
      } catch (e) {
        // ignore
      }
    })();
  }, [id, toast]);

  // Helper: determine if current user is watching
  useEffect(() => {
    const uid = user?.id ? Number(user.id) : null;
    if (uid) {
      setIsWatching(watchers?.some((w) => w.user_id === uid) || false);
    } else {
      setIsWatching(false);
    }
  }, [watchers, user]);

  const postMessage = async () => {
    if (!newMessage.trim()) {
      toast({ status: 'warning', title: 'Please enter a message' });
      return;
    }

    setSubmitting(true);
    try {
      await postTicketMessage(Number(id), {
        message_type: 'comment',
        content_format: 'text',
        body: newMessage
      });
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
      // If site contact was selected, add as watcher with type site_contact
      if (siteContactUserId) {
        try {
          await addTicketWatcher(Number(id), { user_id: siteContactUserId, watcher_type: 'site_contact' });
          const ws = await getTicketWatchers(Number(id));
          setWatchers(ws);
        } catch (e) {
          console.warn('Failed to add site contact watcher', e);
        } finally {
          setSiteContactUserId(null);
        }
      }
    } catch (e: any) {
      if (e?.status === 412) {
        // Concurrency conflict
        try { const fresh = await getTicket(Number(id)); setTicket(fresh); } catch {}
        toast({ status: 'warning', title: 'Ticket changed by someone else', description: 'We refreshed the latest state. Please re-apply your changes.' });
      } else {
        toast({ status: 'error', title: 'Failed to update ticket', description: e.message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Quick save for sidebar fields
  const quickSaveField = async (field: 'assignee_user_id' | 'category_id' | 'privacy_level', value: any) => {
    try {
      setQuickSaving((s) => ({ ...s, [field]: true }));
      await updateTicketFields(Number(id), { [field]: value } as any);
      const updated = await getTicket(Number(id));
      setTicket(updated);
      setEditValues((prev: any) => ({ ...prev, [field]: value }));
      toast({ status: 'success', title: 'Saved', description: `${field.replace('_', ' ')} updated` });
    } catch (e: any) {
      if (e?.status === 412) {
        try { const fresh = await getTicket(Number(id)); setTicket(fresh); } catch {}
        toast({ status: 'warning', title: 'Save conflicted', description: 'Ticket changed elsewhere. Refreshed—please try again.' });
      } else {
        toast({ status: 'error', title: 'Quick save failed', description: e.message });
      }
    } finally {
      setQuickSaving((s) => ({ ...s, [field]: false }));
    }
  };

  const persistTicketType = async (newType: string) => {
    // Resolve type_id using metadata.types when available; fallback to heuristic map
    let newTypeId: number | undefined = undefined;
    if (metadata && Array.isArray((metadata as any).types)) {
      const types = (metadata as any).types as Array<{ type_id: number; type_name: string }>;
      const match = types.find((t) => {
        const name = t.type_name?.toLowerCase() || '';
        if (newType === 'order_request') return name.includes('purchase') || name.includes('order');
        if (newType === 'change_request') return name.includes('change');
        return name.includes('user') || name.includes('help');
      });
      if (match) newTypeId = match.type_id;
    }
    if (!newTypeId) {
      const map: Record<string, number> = {
        user_request: 1,
        order_request: 2,
        change_request: 3
      };
      newTypeId = map[newType];
    }
    setTicketType(newType);
    setTypeId(newTypeId);
    if (!newTypeId) return;
    try {
      setSubmitting(true);
      await patchTicketType(Number(id), newTypeId);
      const updated = await getTicket(Number(id));
      setTicket(updated);
      toast({ status: 'success', title: 'Ticket type updated' });
    } catch (e: any) {
      toast({ status: 'error', title: 'Failed to update ticket type', description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const saveDynamicForm = async () => {
    // Minimal viable persistence: post a structured comment so it's auditable
    try {
      setSubmitting(true);
      const summaryLines = [
        `Ticket type: ${ticketType}${typeId ? ` (id ${typeId})` : ''}`,
        'Form data:'
      ];
      for (const [k, v] of Object.entries(formFields)) {
        summaryLines.push(`- ${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`);
      }
      const body = summaryLines.join('\n');
      await postTicketMessage(Number(id), {
        message_type: 'comment',
        content_format: 'text',
        body
      });
      const updatedMessages = await getTicketMessages(Number(id));
      setMessages(updatedMessages);
      toast({ status: 'success', title: 'Form saved to activity' });
    } catch (e: any) {
      toast({ status: 'error', title: 'Failed to save form', description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Watchers operations
  const handleAddWatcher = async () => {
    try {
      if (!newWatcher.user_id && (!newWatcher.email || !newWatcher.name)) {
        toast({ status: 'warning', title: 'Provide a user or name+email' });
        return;
      }
      setSubmitting(true);
      await addTicketWatcher(Number(id), {
        user_id: newWatcher.user_id ?? null,
        name: newWatcher.name || null,
        email: newWatcher.email || null,
        watcher_type: newWatcher.watcher_type || 'interested'
      });
      const ws = await getTicketWatchers(Number(id));
      setWatchers(ws);
      setAddWatcherOpen(false);
      setNewWatcher({ watcher_type: 'interested' });
      toast({ status: 'success', title: 'Watcher added' });
    } catch (e: any) {
      toast({ status: 'error', title: 'Failed to add watcher', description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveWatcher = async (watcherId: number) => {
    try {
      setSubmitting(true);
      await removeTicketWatcher(Number(id), watcherId);
      const ws = await getTicketWatchers(Number(id));
      setWatchers(ws);
      toast({ status: 'success', title: 'Watcher removed' });
    } catch (e: any) {
      toast({ status: 'error', title: 'Failed to remove watcher', description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWatchToggle = async () => {
    try {
      if (!user?.id) {
        toast({ status: 'info', title: 'Login required', description: 'Sign in to watch this ticket.' });
        return;
      }
      setSubmitting(true);
      const uid = Number(user.id);
      if (isWatching) {
        const me = watchers.find((w) => w.user_id === uid);
        if (me) {
          await removeTicketWatcher(Number(id), me.watcher_id);
          const ws = await getTicketWatchers(Number(id));
          setWatchers(ws);
          toast({ status: 'success', title: 'Stopped watching' });
        }
      } else {
        await addTicketWatcher(Number(id), { user_id: uid, watcher_type: 'interested' });
        const ws = await getTicketWatchers(Number(id));
        setWatchers(ws);
        toast({ status: 'success', title: 'Now watching this ticket' });
      }
    } catch (e: any) {
      toast({ status: 'error', title: 'Watch action failed', description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Attachments operations
  const handleAddAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSubmitting(true);
      await uploadTicketAttachment(Number(id), file);
      toast({ status: 'success', title: 'Attachment uploaded' });
      // Optional: post a message entry for the upload
      await postTicketMessage(Number(id), { message_type: 'system', content_format: 'text', body: `Attachment uploaded: ${file.name}` });
      const updatedMessages = await getTicketMessages(Number(id));
      setMessages(updatedMessages);
    } catch (e: any) {
      toast({ status: 'error', title: 'Upload failed', description: e.message });
    } finally {
      setSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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

  // Resolve a friendly ticket type name using server data when available
  const getFriendlyTypeName = (): string | undefined => {
    // Prefer server-provided name
    const tn = (ticket as any)?.type_name as string | undefined;
    if (tn && tn.trim().length > 0) return tn;
    // Try to resolve from metadata by typeId
    if (typeId && metadata && Array.isArray((metadata as any).types)) {
      const match = (metadata as any).types.find((t: any) => t.type_id === typeId);
      if (match?.type_name) return match.type_name as string;
    }
    // Fallback to label based on current selection
    switch (ticketType) {
      case 'order_request': return 'Order Request';
      case 'change_request': return 'Change Request';
      case 'user_request': return 'User Request';
      default: return undefined;
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
                    <Heading size="lg" fontWeight="bold" textShadow="0 1px 2px rgba(0,0,0,0.6)">
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
                    {getFriendlyTypeName() && (
                      <Badge 
                        colorScheme="purple" 
                        variant="subtle" 
                        px={3} 
                        py={1} 
                        borderRadius="full"
                        fontSize="sm"
                      >
                        {getFriendlyTypeName()}
                      </Badge>
                    )}
                  </HStack>
                  <Text fontSize="xl" fontWeight="semibold" opacity={0.95} textShadow="0 1px 2px rgba(0,0,0,0.5)">
                    {ticket.summary}
                  </Text>
                  <HStack spacing={4} fontSize="sm" opacity={0.95} color="white" textShadow="0 1px 2px rgba(0,0,0,0.5)">
                    <HStack>
                      <Icon as={UserIcon} />
                      <Text>Created by {ticket.created_by_name || 'Unknown'}</Text>
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
                      <MenuItem onClick={() => setAddWatcherOpen(true)}>
                        <Icon as={EyeIcon} mr={2} />
                        Add Watcher
                      </MenuItem>
                      <MenuItem onClick={handleAddAttachmentClick}>
                        <Icon as={PaperClipIcon} mr={2} />
                        Add Attachment
                      </MenuItem>
                    </MenuList>
                  </Menu>
                  <input ref={fileInputRef} type="file" hidden onChange={handleFileSelected} />
                  
                  <Box w="200px">
                    <Text fontSize="xs" opacity={0.95} mb={1} color="white" textShadow="0 1px 2px rgba(0,0,0,0.5)">Progress: {getStatusProgress(ticket.status)}%</Text>
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

                        {/* Editable Fields */}
                        <Box>
                          <Heading size="md" color={textPrimary} mb={3}>
                            Fields
                          </Heading>
                          <Card bg={cardBg} borderColor={borderColor}>
                            <CardBody>
                              <VStack spacing={4} align="stretch">
                                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                  {/* Summary */}
                                  <FormControl>
                                    <FormLabel color={textSecondary}>Summary</FormLabel>
                                    {editMode ? (
                                      <Input
                                        value={editValues.summary || ''}
                                        onChange={(e) => setEditValues({ ...editValues, summary: e.target.value })}
                                        placeholder="Summarize the issue"
                                      />
                                    ) : (
                                      <Text color={textSecondary}>{ticket.summary}</Text>
                                    )}
                                  </FormControl>

                                  {/* Status */}
                                  <FormControl>
                                    <FormLabel color={textSecondary}>Status</FormLabel>
                                    {editMode ? (
                                      <ChakraSelect
                                        useBasicStyles
                                        isSearchable
                                        selectedOptionStyle="check"
                                        colorScheme="blue"
                                        value={
                                          metadata?.statuses
                                            .map(s => ({ label: s.status_name, value: s.status_code }))
                                            .find(o => o.value === (editValues.status || ticket.status)) || null
                                        }
                                        onChange={(opt: any) => setEditValues({ ...editValues, status: opt?.value })}
                                        options={metadata?.statuses.map(s => ({ label: s.status_name, value: s.status_code })) || []}
                                      />
                                    ) : (
                                      <Badge colorScheme={getStatusColor(ticket.status)}>{ticket.status}</Badge>
                                    )}
                                  </FormControl>

                                  {/* Substatus */}
                                  <FormControl>
                                    <FormLabel color={textSecondary}>Substatus</FormLabel>
                                    {editMode ? (
                                      <ChakraSelect
                                        useBasicStyles
                                        isSearchable
                                        selectedOptionStyle="check"
                                        colorScheme="blue"
                                        value={
                                          metadata?.substatuses
                                            .filter(s => s.status_code === (editValues.status || ticket.status))
                                            .map(s => ({ label: s.substatus_name, value: s.substatus_code }))
                                            .find(o => o.value === (editValues.substatus_code || ticket.substatus_code)) || null
                                        }
                                        onChange={(opt: any) => setEditValues({ ...editValues, substatus_code: opt?.value })}
                                        options={
                                          metadata?.substatuses
                                            .filter(s => s.status_code === (editValues.status || ticket.status))
                                            .map(s => ({ label: s.substatus_name, value: s.substatus_code })) || []
                                        }
                                        placeholder="Select substatus"
                                      />
                                    ) : (
                                      <Text color={textSecondary}>{ticket.substatus_name || '—'}</Text>
                                    )}
                                  </FormControl>

                                  {/* Severity */}
                                  <FormControl>
                                    <FormLabel color={textSecondary}>Severity</FormLabel>
                                    {editMode ? (
                                      <ChakraSelect
                                        useBasicStyles
                                        isSearchable
                                        selectedOptionStyle="check"
                                        colorScheme="blue"
                                        value={{ label: getSeverityLabel(editValues.severity || ticket.severity), value: (editValues.severity || ticket.severity) }}
                                        onChange={(opt: any) => setEditValues({ ...editValues, severity: Number(opt?.value) })}
                                        options={[
                                          { label: 'Low', value: 1 },
                                          { label: 'Medium', value: 2 },
                                          { label: 'High', value: 3 },
                                          { label: 'Critical', value: 4 },
                                          { label: 'Emergency', value: 5 }
                                        ]}
                                      />
                                    ) : (
                                      <Badge colorScheme={getSeverityColor(ticket.severity)}>{getSeverityLabel(ticket.severity)}</Badge>
                                    )}
                                  </FormControl>

                                  {/* Site */}
                                  <FormControl>
                                    <FormLabel color={textSecondary}>Site</FormLabel>
                                    {editMode ? (
                                      <ChakraSelect
                                        useBasicStyles
                                        isSearchable
                                        selectedOptionStyle="check"
                                        colorScheme="blue"
                                        value={
                                          metadata?.sites
                                            .map(s => ({ label: s.display_name || s.name, value: s.site_id }))
                                            .find(o => o.value === (editValues.site_id || ticket.site_id)) || null
                                        }
                                        onChange={(opt: any) => setEditValues({ ...editValues, site_id: Number(opt?.value) })}
                                        options={metadata?.sites.map(s => ({ label: s.display_name || s.name, value: s.site_id })) || []}
                                      />
                                    ) : (
                                      <Text color={textSecondary}>{ticket.site_name}</Text>
                                    )}
                                  </FormControl>

                                  {/* Category moved to sidebar */}

                                  {/* Assigned To moved to sidebar */}

                                  {/* Privacy moved to sidebar */}

                                  {/* Site Contact (adds watcher) */}
                                  <FormControl>
                                    <FormLabel color={textSecondary}>Site Contact</FormLabel>
                                    {editMode ? (
                                      <ChakraSelect
                                        useBasicStyles
                                        isSearchable
                                        selectedOptionStyle="check"
                                        colorScheme="blue"
                                        value={
                                          siteContactUserId
                                            ? metadata?.users.map(u => ({ label: `${u.name} (${u.email})`, value: u.user_id })).find(o => o.value === siteContactUserId) || null
                                            : null
                                        }
                                        onChange={(opt: any) => setSiteContactUserId(opt ? Number(opt.value) : null)}
                                        options={metadata?.users.map(u => ({ label: `${u.name} (${u.email})`, value: u.user_id })) || []}
                                        placeholder="Select site contact"
                                        isClearable
                                      />
                                    ) : (
                                      <Text color={textSecondary}>{ticket.contact_name || '—'}</Text>
                                    )}
                                  </FormControl>

                                  {/* Contact Name */}
                                  <FormControl>
                                    <FormLabel color={textSecondary}>Contact Name</FormLabel>
                                    {editMode ? (
                                      <Input
                                        value={editValues.contact_name || ''}
                                        onChange={(e) => setEditValues({ ...editValues, contact_name: e.target.value })}
                                        placeholder="Primary contact name"
                                      />
                                    ) : (
                                      <Text color={textSecondary}>{ticket.contact_name || '—'}</Text>
                                    )}
                                  </FormControl>

                                  {/* Contact Email */}
                                  <FormControl>
                                    <FormLabel color={textSecondary}>Contact Email</FormLabel>
                                    {editMode ? (
                                      <Input
                                        type="email"
                                        value={editValues.contact_email || ''}
                                        onChange={(e) => setEditValues({ ...editValues, contact_email: e.target.value })}
                                        placeholder="name@example.com"
                                      />
                                    ) : (
                                      <Text color={textSecondary}>{ticket.contact_email || '—'}</Text>
                                    )}
                                  </FormControl>

                                  {/* Contact Phone */}
                                  <FormControl>
                                    <FormLabel color={textSecondary}>Contact Phone</FormLabel>
                                    {editMode ? (
                                      <Input
                                        value={editValues.contact_phone || ''}
                                        onChange={(e) => setEditValues({ ...editValues, contact_phone: e.target.value })}
                                        placeholder="(555) 555-5555"
                                      />
                                    ) : (
                                      <Text color={textSecondary}>{ticket.contact_phone || '—'}</Text>
                                    )}
                                  </FormControl>

                                  {/* Problem Description */}
                                  <FormControl>
                                    <FormLabel color={textSecondary}>Problem Description</FormLabel>
                                    {editMode ? (
                                      <Textarea
                                        value={editValues.problem_description || ''}
                                        onChange={(e) => setEditValues({ ...editValues, problem_description: e.target.value })}
                                        placeholder="More detailed problem context"
                                        rows={4}
                                      />
                                    ) : (
                                      <Text color={textSecondary} whiteSpace="pre-wrap">{ticket.problem_description || '—'}</Text>
                                    )}
                                  </FormControl>
                                </SimpleGrid>
                              </VStack>
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
                                          {message.body_text || message.body}
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
                                  variant="solid"
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
                              onChange={(val) => persistTicketType(val)}
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

                        <HStack justify="flex-end">
                          <Button
                            onClick={saveDynamicForm}
                            colorScheme="blue"
                            variant="solid"
                            isLoading={submitting}
                          >
                            Save Form
                          </Button>
                        </HStack>
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
                      <StatLabel color={textSecondary}>Ticket Type</StatLabel>
                      <StatNumber fontSize="md" color={textPrimary}>
                        {getFriendlyTypeName() || '—'}
                      </StatNumber>
                    </Stat>

                    <Divider />
                    
                    <Stat>
                      <StatLabel color={textSecondary}>Assigned To</StatLabel>
                      {editMode ? (
                        <ChakraSelect
                          useBasicStyles
                          isSearchable
                          selectedOptionStyle="check"
                          colorScheme="blue"
                          value={
                            metadata?.users
                              .map(u => ({ label: `${u.name} (${u.email})`, value: u.user_id }))
                              .find(o => o.value === (editValues.assignee_user_id ?? ticket.assignee_user_id ?? undefined)) || null
                          }
                          onChange={(opt: any) => {
                            const newVal = opt ? Number(opt.value) : null;
                            setEditValues({ ...editValues, assignee_user_id: newVal });
                            quickSaveField('assignee_user_id', newVal);
                          }}
                          options={metadata?.users.map(u => ({ label: `${u.name} (${u.email})`, value: u.user_id })) || []}
                          placeholder="Select assignee"
                          isClearable
                        />
                      ) : (
                        <StatNumber fontSize="md" color={textPrimary}>
                          {ticket.assignee_name || 'Unassigned'}
                        </StatNumber>
                      )}
                      {quickSaving.assignee_user_id && <Text fontSize="xs" color={textSecondary}>Saving…</Text>}
                    </Stat>
                    
                    <Divider />
                    
                    <Stat>
                      <StatLabel color={textSecondary}>Category</StatLabel>
                      {editMode ? (
                        <ChakraSelect
                          useBasicStyles
                          isSearchable
                          selectedOptionStyle="check"
                          colorScheme="blue"
                          value={
                            metadata?.categories
                              .map(c => ({ label: c.name, value: c.category_id }))
                              .find(o => o.value === (editValues.category_id ?? ticket.category_id ?? undefined)) || null
                          }
                          onChange={(opt: any) => {
                            const newVal = opt ? Number(opt.value) : null;
                            setEditValues({ ...editValues, category_id: newVal });
                            quickSaveField('category_id', newVal);
                          }}
                          options={metadata?.categories.map(c => ({ label: c.name, value: c.category_id })) || []}
                          placeholder="Select category"
                          isClearable
                        />
                      ) : (
                        <StatNumber fontSize="md" color={textPrimary}>
                          {ticket.category_name || 'No category'}
                        </StatNumber>
                      )}
                      {quickSaving.category_id && <Text fontSize="xs" color={textSecondary}>Saving…</Text>}
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
                      {editMode ? (
                        <ChakraSelect
                          useBasicStyles
                          isSearchable
                          selectedOptionStyle="check"
                          colorScheme="blue"
                          value={{ label: (editValues.privacy_level || ticket.privacy_level || 'public'), value: (editValues.privacy_level || ticket.privacy_level || 'public') }}
                          onChange={(opt: any) => {
                            const newVal = opt?.value;
                            setEditValues({ ...editValues, privacy_level: newVal });
                            quickSaveField('privacy_level', newVal);
                          }}
                          options={[
                            { label: 'public', value: 'public' },
                            { label: 'site_only', value: 'site_only' },
                            { label: 'private', value: 'private' },
                          ]}
                        />
                      ) : (
                        <StatNumber fontSize="md" color={textPrimary}>
                          <Badge colorScheme={ticket.privacy_level === 'public' ? 'green' : 'orange'}>
                            {ticket.privacy_level || 'Public'}
                          </Badge>
                        </StatNumber>
                      )}
                      {quickSaving.privacy_level && <Text fontSize="xs" color={textSecondary}>Saving…</Text>}
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
                          variant="solid"
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
                          colorScheme={isWatching ? 'red' : 'green'} 
                          variant="outline" 
                          size="sm"
                          onClick={handleWatchToggle}
                          leftIcon={<Icon as={EyeIcon} />}
                        >
                          {isWatching ? 'Unwatch' : 'Watch Ticket'}
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
                  <VStack spacing={3} align="stretch">
                    {watchers && watchers.length > 0 ? (
                      watchers.map((w) => (
                        <Flex key={w.watcher_id} align="center" justify="space-between" borderWidth="1px" borderColor={borderColor} borderRadius="md" p={2}>
                          <HStack>
                            <Avatar size="xs" name={w.name || w.email || 'Watcher'} />
                            <Box>
                              <Text fontSize="sm" color={textPrimary}>{w.name || 'External Watcher'}</Text>
                              <Text fontSize="xs" color={textSecondary}>{w.email || (w.user_id ? `User #${w.user_id}` : '')}</Text>
                            </Box>
                            <Badge colorScheme="blue">{w.watcher_type}</Badge>
                          </HStack>
                          <Button size="xs" variant="ghost" colorScheme="red" onClick={() => handleRemoveWatcher(w.watcher_id)}>Remove</Button>
                        </Flex>
                      ))
                    ) : (
                      <Text color={textSecondary} fontSize="sm" textAlign="center">No watchers yet</Text>
                    )}
                    <Button size="xs" variant="outline" colorScheme="blue" onClick={() => setAddWatcherOpen(true)}>
                      Add Watcher
                    </Button>
                  </VStack>
                </CardBody>
              </Card>

              {/* Vendor Service Request */}
              <Card bg={cardBg} shadow="lg" borderColor={borderColor}>
                <CardHeader bg="gray.50" borderTopRadius="md">
                  <Heading size="sm" color={textPrimary}>Vendor Service Request</Heading>
                </CardHeader>
                <CardBody>
                  <VStack spacing={3} align="stretch">
                    <FormControl>
                      <FormLabel color={textSecondary}>Vendor</FormLabel>
                      <ChakraSelect
                        useBasicStyles
                        isSearchable
                        selectedOptionStyle="check"
                        colorScheme="blue"
                        value={
                          vsrForm.vendor_id
                            ? vendors.map(v => ({ label: v.name, value: v.vendor_id })).find(o => o.value === vsrForm.vendor_id) || null
                            : null
                        }
                        onChange={(opt: any) => setVsrForm({ ...vsrForm, vendor_id: opt ? Number(opt.value) : null })}
                        options={vendors.map(v => ({ label: v.name, value: v.vendor_id }))}
                        placeholder="Select vendor"
                        isClearable
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel color={textSecondary}>Request Type</FormLabel>
                      <Input value={vsrForm.request_type} onChange={(e) => setVsrForm({ ...vsrForm, request_type: e.target.value })} placeholder="e.g., Repair, Install, PM" />
                    </FormControl>
                    <FormControl>
                      <FormLabel color={textSecondary}>Status</FormLabel>
                      <Select value={vsrForm.status} onChange={(e) => setVsrForm({ ...vsrForm, status: e.target.value })}>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="waiting_vendor">Waiting on Vendor</option>
                        <option value="completed">Completed</option>
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel color={textSecondary}>Notes</FormLabel>
                      <Textarea rows={3} value={vsrForm.notes} onChange={(e) => setVsrForm({ ...vsrForm, notes: e.target.value })} placeholder="Optional notes for the vendor" />
                    </FormControl>
                    <HStack justify="flex-end">
                      <Button
                        size="sm"
                        colorScheme="blue"
                        isDisabled={!vsrForm.vendor_id || !vsrForm.request_type}
                        isLoading={submitting}
                        onClick={async () => {
                          try {
                            setSubmitting(true);
                            await upsertVendorServiceRequest({
                              ticket_id: Number(id),
                              vendor_id: Number(vsrForm.vendor_id),
                              request_type: vsrForm.request_type,
                              status: vsrForm.status,
                              notes: vsrForm.notes || undefined
                            });
                            toast({ status: 'success', title: 'Service request saved' });
                            try {
                              await postTicketMessage(Number(id), { message_type: 'system', content_format: 'text', body: `Vendor service request created for vendor ${vendors.find(v => v.vendor_id === vsrForm.vendor_id)?.name || vsrForm.vendor_id}` });
                              const updatedMessages = await getTicketMessages(Number(id));
                              setMessages(updatedMessages);
                            } catch {}
                            setVsrForm({ vendor_id: null, request_type: '', status: 'open', notes: '' });
                          } catch (e: any) {
                            toast({ status: 'error', title: 'Failed to save service request', description: e.message });
                          } finally {
                            setSubmitting(false);
                          }
                        }}
                      >
                        Save Request
                      </Button>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>

              {/* Add Watcher Modal */}
              <Modal isOpen={addWatcherOpen} onClose={() => setAddWatcherOpen(false)}>
                <ModalOverlay />
                <ModalContent>
                  <ModalHeader>Add Watcher</ModalHeader>
                  <ModalCloseButton />
                  <ModalBody pb={6}>
                    <VStack align="stretch" spacing={4}>
                      <Text fontSize="sm" color={textSecondary}>Select an existing user or enter name and email for an external watcher.</Text>
                      <FormControl>
                        <FormLabel>User (optional)</FormLabel>
                        <ChakraSelect
                          useBasicStyles
                          isSearchable
                          selectedOptionStyle="check"
                          colorScheme="blue"
                          value={
                            newWatcher.user_id
                              ? metadata?.users.map(u => ({ label: `${u.name} (${u.email})`, value: u.user_id })).find(o => o.value === newWatcher.user_id) || null
                              : null
                          }
                          onChange={(opt: any) => setNewWatcher({ ...newWatcher, user_id: opt ? Number(opt.value) : null })}
                          options={metadata?.users.map(u => ({ label: `${u.name} (${u.email})`, value: u.user_id })) || []}
                          placeholder="Search users..."
                          isClearable
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Name (for external)</FormLabel>
                        <Input value={newWatcher.name || ''} onChange={(e) => setNewWatcher({ ...newWatcher, name: e.target.value })} />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Email (for external)</FormLabel>
                        <Input type="email" value={newWatcher.email || ''} onChange={(e) => setNewWatcher({ ...newWatcher, email: e.target.value })} />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Watcher Type</FormLabel>
                        <Select value={newWatcher.watcher_type} onChange={(e) => setNewWatcher({ ...newWatcher, watcher_type: e.target.value as any })}>
                          <option value="interested">Interested</option>
                          <option value="collaborator">Collaborator</option>
                          <option value="site_contact">Site Contact</option>
                          <option value="assignee_backup">Assignee Backup</option>
                        </Select>
                      </FormControl>
                      <HStack justify="flex-end">
                        <Button onClick={() => setAddWatcherOpen(false)} variant="ghost">Cancel</Button>
                        <Button onClick={handleAddWatcher} colorScheme="blue" isLoading={submitting}>Add</Button>
                      </HStack>
                    </VStack>
                  </ModalBody>
                </ModalContent>
              </Modal>
            </VStack>
          </Grid>
        </Container>
      </Box>
    </AppLayout>
  );
}
