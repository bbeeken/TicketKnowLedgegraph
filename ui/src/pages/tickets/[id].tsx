import { useRouter } from 'next/router';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTicketWebSocket } from '@/hooks/useTicketWebSocket';
import { WebSocketStatus } from '@/components/WebSocketStatus';
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
  getTicketAttachments,
  downloadTicketAttachment,
  deleteTicketAttachment,
  linkAssetToTicket,
  unlinkAssetFromTicket,
  type TicketMetadata,
  type TicketWatcher,
  type TicketAttachment
} from '@/lib/api/tickets';
import { getVendors, type Vendor } from '@/lib/api/vendors';
import { VendorServiceRequestsPanel } from '@/components/tickets/VendorServiceRequestsPanel';
import { getAssets, getAsset, createAsset, updateAsset, updateAssetStatus, getAssetMaintenanceNotes, type Asset, type CreateAssetPayload } from '@/lib/api/assets';
import { ContactInfoPopover } from '@/components/shared/ContactInfoPopover';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { AttachmentManager } from '@/components/shared/AttachmentManager';
import { apiFetch } from '@/lib/api/client';
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
  InputGroup,
  InputLeftElement,
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
  ModalFooter,
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
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  PaperClipIcon,
  EyeIcon,
  CalendarIcon,
  TagIcon,
  ChevronRightIcon,
  PlusIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon
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
  
  // Quick actions state
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [reminderNote, setReminderNote] = useState('');

  // WebSocket integration for real-time updates
  const {
    isConnected: wsConnected,
    subscribeToTicket,
    unsubscribeFromTicket
  } = useTicketWebSocket({
    onTicketUpdate: (ticketId, payload) => {
      if (ticketId === parseInt(id as string)) {
        console.log('Received ticket update:', payload);
        toast({
          title: 'Ticket Updated',
          description: `Ticket was updated by ${payload.updatedBy === user?.id ? 'you' : 'another user'}`,
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
        // Refresh ticket data
        loadTicket();
      }
    },
    onTicketComment: (ticketId, comment) => {
      if (ticketId === parseInt(id as string)) {
        console.log('Received new comment:', comment);
        toast({
          title: 'New Comment',
          description: `${comment.authorId === user?.id ? 'You' : 'Someone'} added a comment`,
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
        // Refresh messages
        loadMessages();
      }
    },
    onTicketStatusChange: (ticketId, statusChange) => {
      if (ticketId === parseInt(id as string)) {
        console.log('Received status change:', statusChange);
        toast({
          title: 'Status Changed',
          description: `Ticket status updated`,
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
        // Refresh ticket data
        loadTicket();
      }
    },
    onTicketAssignment: (ticketId, assignment) => {
      if (ticketId === parseInt(id as string)) {
        console.log('Received assignment change:', assignment);
        toast({
          title: 'Assignment Changed',
          description: `Ticket assignment updated`,
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
        // Refresh ticket data
        loadTicket();
      }
    }
  });

  // Data loading functions for WebSocket integration
  const loadTicket = useCallback(async () => {
    if (!id) return;
    try {
      const ticketData = await getTicket(Number(id));
      setTicket(ticketData);
      // Update edit values when ticket data changes
      setEditValues({
        description: ticketData.description || '',
        status: ticketData.status || 'open',
        site_id: ticketData.site_id || '',
        category_id: ticketData.category_id || '',
        substatus_code: ticketData.substatus_code || '',
        problem_description: ticketData.problem_description || '',
        contact_name: ticketData.contact_name || '',
        contact_email: ticketData.contact_email || '',
        contact_phone: ticketData.contact_phone || ''
      });
    } catch (error) {
      console.error('Failed to load ticket:', error);
    }
  }, [id]);

  const loadMessages = useCallback(async () => {
    if (!id) return;
    try {
      const messagesData = await getTicketMessages(Number(id));
      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [id]);

  // Subscribe to WebSocket updates when ticket ID changes
  useEffect(() => {
    if (id && wsConnected) {
      const ticketId = parseInt(id as string);
      subscribeToTicket(ticketId);
      
      return () => {
        unsubscribeFromTicket(ticketId);
      };
    }
  }, [id, wsConnected, subscribeToTicket, unsubscribeFromTicket]);

  // Asset search modal state
  const [assetSearchOpen, setAssetSearchOpen] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [assetSearchTerm, setAssetSearchTerm] = useState('');
  const [assetSearchLoading, setAssetSearchLoading] = useState(false);
  const [ticketAssets, setTicketAssets] = useState<any[]>([]);
  const assetSearchInputRef = useRef<HTMLInputElement>(null);

  // Service Request Management state
  // Service requests now handled by extracted component

  // Attachments state
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  // Asset status update state
  const [assetStatusUpdate, setAssetStatusUpdate] = useState({
    asset_id: undefined as number | undefined,
    status: 'operational' as string,
    notes: '' as string
  });

  const [assetNotesMap, setAssetNotesMap] = useState<Record<number, string>>({});

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

  // Contact management colors
  const assigneeBg = useColorModeValue('purple.50', 'purple.900');
  const assigneeHover = useColorModeValue('purple.100', 'purple.800');
  const siteContactBg = useColorModeValue('green.50', 'green.900');
  const siteContactHover = useColorModeValue('green.100', 'green.800');

  const handleTicketAssetUnlink = async (assetId: number) => {
    if (!id) return;
    
    try {
      await unlinkAssetFromTicket(Number(id), assetId);
      setTicketAssets(prev => prev.filter(asset => asset.asset_id !== assetId));
      toast({ 
        status: 'success', 
        title: 'Asset unlinked successfully',
        description: `Asset #${assetId} has been removed from this ticket`
      });
    } catch (error: any) {
      toast({ 
        status: 'error', 
        title: 'Failed to unlink asset', 
        description: error.message 
      });
    }
  };

  const handleUpdateAssetStatus = async () => {
    if (!assetStatusUpdate.asset_id) {
      toast({ status: 'warning', title: 'Please select an asset to update' });
      return;
    }

    try {
      await updateAssetStatus(assetStatusUpdate.asset_id, assetStatusUpdate.status, assetStatusUpdate.notes);
      setAssetNotesMap(prev => ({ ...prev, [assetStatusUpdate.asset_id!]: assetStatusUpdate.notes }));
      
      // Update the ticket assets list to reflect the new status
      setTicketAssets(prev => prev.map(asset => 
        asset.asset_id === assetStatusUpdate.asset_id 
          ? { ...asset, status: assetStatusUpdate.status }
          : asset
      ));
      
      toast({ 
        status: 'success', 
        title: 'Asset status updated successfully', 
        description: `Asset #${assetStatusUpdate.asset_id} status updated to ${assetStatusUpdate.status}` 
      });
      
      // Reset form
      setAssetStatusUpdate({ 
        asset_id: undefined, 
        status: 'operational', 
        notes: '' 
      });
    } catch (error: any) {
      toast({ status: 'error', title: 'Failed to update asset status', description: error.message });
    }
  };

  // Asset search modal functions
  const loadAvailableAssets = useCallback(async () => {
    try {
      setAssetSearchLoading(true);
      const assets = await getAssets();
      // Filter out assets that are already linked to this ticket
      const unlinkedAssets = assets.filter(asset => 
        !ticketAssets.some(linkedAsset => linkedAsset.asset_id === asset.asset_id)
      );
      setAvailableAssets(unlinkedAssets);
    } catch (error: any) {
      console.error('Failed to load assets:', error);
      toast({ 
        status: 'error', 
        title: 'Failed to load assets', 
        description: error.message 
      });
    } finally {
      setAssetSearchLoading(false);
    }
  }, [ticketAssets, toast]);

  const handleOpenAssetSearch = () => {
    setAssetSearchOpen(true);
    setAssetSearchTerm('');
    setSelectedAsset(null);
    loadAvailableAssets();
  };

  const handleSelectAsset = (asset: any) => {
    setSelectedAsset(asset);
  };

  const handleLinkAsset = async () => {
    if (!selectedAsset || !id) return;
    
    try {
      await linkAssetToTicket(Number(id), selectedAsset.asset_id);
      
      // Update ticket assets list
      setTicketAssets(prev => [...prev, selectedAsset]);
      
      // Remove from available assets
      setAvailableAssets(prev => prev.filter(asset => asset.asset_id !== selectedAsset.asset_id));
      
      setAssetSearchOpen(false);
      setSelectedAsset(null);
      
      toast({ 
        status: 'success', 
        title: 'Asset linked successfully',
        description: `Asset #${selectedAsset.asset_id} has been linked to this ticket`
      });
    } catch (error: any) {
      toast({ 
        status: 'error', 
        title: 'Failed to link asset', 
        description: error.message 
      });
    }
  };

  // Helper functions for asset display (single source; cache-bust marker 2025-09-18)
  const getAssetTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'fuel': return '⛽';
      case 'power': return '⚡';
      case 'network': return '🌐';
      case 'pos': return '�';
      case 'hvac': return '🌡️';
      case 'security': return '🔒';
      case 'building': return '�';
      case 'dispenser': return '⛽';
      default: return '⚙️';
    }
  };

  const getAssetStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'operational': return 'green';
      case 'warning': return 'yellow';
      case 'critical': return 'red';
      case 'maintenance': return 'blue';
      case 'offline': return 'gray';
      default: return 'gray';
    }
  };

  // (Duplicate watcher/header color & ticket state block removed)
  const [vendors, setVendors] = useState<Vendor[]>([]);
  // Vendor notes managed inside component (localStorage persistence retained there)
  const [quickSaving, setQuickSaving] = useState<Record<string, boolean>>({});

  // Removed: service request loading logic moved to component

  // Normalize API-provided status (often uppercase) to match select option values
  const normalizeAssetStatus = (s?: string) => {
    if (!s) return 'operational';
    const lower = s.toLowerCase();
    const allowed = ['operational','warning','critical','maintenance','offline'];
    return allowed.includes(lower) ? lower : 'operational';
  };

  // Asset documentation and knowledge handlers
  const handleViewAssetManuals = () => {
    if (ticketAssets.length > 0) {
      const assetId = ticketAssets[0].asset_id;
      window.open(`/assets/manuals?asset=${assetId}`, '_blank');
    } else {
      toast({
        status: 'info',
        title: 'No assets linked',
        description: 'Link assets to this ticket to view manuals'
      });
    }
  };

  const handleMaintenanceHistory = () => {
    if (ticketAssets.length > 0) {
      const assetId = ticketAssets[0].asset_id;
      window.open(`/assets/maintenance?asset=${assetId}`, '_blank');
    } else {
      toast({
        status: 'info',
        title: 'No assets linked',
        description: 'Link assets to this ticket to view maintenance history'
      });
    }
  };

  const handleKnowledgeBase = () => {
    const categories = ticket.category_name ? encodeURIComponent(ticket.category_name) : '';
    const query = encodeURIComponent(ticket.summary || '');
    const fromUrl = encodeURIComponent(`/tickets/${id}`);
    router.push(`/knowledge?category=${categories}&q=${query}&from=${fromUrl}`);
  };

  const handleAssetAnalytics = () => {
    const assetIds = ticketAssets.map(a => a.asset_id).join(',');
    if (assetIds) {
      window.open(`/analytics/assets?assets=${assetIds}`, '_blank');
    } else {
      toast({
        status: 'info',
        title: 'No assets linked',
        description: 'Link assets to this ticket to view analytics'
      });
    }
  };

  const handleAddDocumentation = () => {
    window.open(`/documentation/new?ticket=${id}`, '_blank');
  };

  const handleViewAssetDetails = (assetId: number) => {
    window.open(`/assets/${assetId}`, '_blank');
  };

  // Attachment handlers
  const loadAttachments = async () => {
    if (!id) return;
    
    setAttachmentsLoading(true);
    try {
      const attachmentData = await getTicketAttachments(Number(id));
      setAttachments(attachmentData as TicketAttachment[]);
    } catch (error) {
      console.error('Error loading attachments:', error);
      toast({
        status: 'error',
        title: 'Failed to load attachments',
        description: 'Could not load ticket attachments'
      });
      setAttachments([]); // fallback to empty array on error
    } finally {
      setAttachmentsLoading(false);
    }
  };

  // Load attachments on mount and when the ticket id changes
  useEffect(() => {
    if (id) {
      loadAttachments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUploadAttachment = async (file: File, kind: string = 'other') => {
    if (!id) return;
    
    try {
      await uploadTicketAttachment(Number(id), file, kind);
      toast({ 
        status: 'success', 
        title: 'Attachment uploaded successfully',
        description: `File "${file.name}" has been uploaded`
      });
      // Refresh attachments list
      await loadAttachments();
    } catch (error: any) {
      console.error('Error uploading attachment:', error);
      toast({
        status: 'error',
        title: 'Failed to upload attachment',
        description: error?.body?.message || error?.message || 'Could not upload the file. Please try again.'
      });
      throw error;
    }
  };

  const handleDownloadAttachment = async (attachmentId: number, filename: string) => {
    if (!id) return;
    
    try {
      const response = await downloadTicketAttachment(Number(id), attachmentId);
      
      // Handle different response formats
      let blob: Blob;
      if (response instanceof Blob) {
        blob = response;
      } else if (response.data instanceof Blob) {
        blob = response.data;
      } else {
        // If response is not a blob, try to convert it
        blob = new Blob([response.data || response]);
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        status: 'success',
        title: 'Download started',
        description: `Downloading "${filename}"`
      });
    } catch (error: any) {
      console.error('Error downloading attachment:', error);
      toast({
        status: 'error',
        title: 'Download failed',
        description: error?.body?.message || error?.message || 'Could not download the file. Please try again.'
      });
      throw error;
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!id) return;
    
    try {
      await deleteTicketAttachment(Number(id), attachmentId);
      toast({
        status: 'success',
        title: 'Attachment deleted',
        description: 'The attachment has been deleted successfully.'
      });
      // Refresh attachments list
      await loadAttachments();
    } catch (error: any) {
      console.error('Error deleting attachment:', error);
      toast({
        status: 'error',
        title: 'Failed to delete attachment',
        description: error?.body?.message || error?.message || 'Could not delete the attachment. Please try again.'
      });
      throw error;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await handleUploadAttachment(file, 'documentation');
      // Clear the input so the same file can be uploaded again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      // Error handling is already done in handleUploadAttachment
      console.error('File upload error:', error);
    }
  };

  const handlePreviewAttachment = async (attachmentId: number, filename: string, mimeType: string) => {
    if (!id) return;
    
    try {
      const response = await downloadTicketAttachment(Number(id), attachmentId);
      
      // Handle different response formats
      let blob: Blob;
      if (response instanceof Blob) {
        blob = response;
      } else if (response.data instanceof Blob) {
        blob = response.data;
      } else {
        // If response is not a blob, try to convert it
        blob = new Blob([response.data || response]);
      }
      
      const url = window.URL.createObjectURL(blob);
      
      // For images, PDFs, and text files, open in a new tab for preview
      if (mimeType.startsWith('image/') || mimeType === 'application/pdf' || mimeType.startsWith('text/')) {
        window.open(url, '_blank');
      } else {
        // For other files, download directly
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
      
      toast({
        status: 'success',
        title: 'Preview opened',
        description: `Opening "${filename}"`
      });
    } catch (error: any) {
      console.error('Error previewing attachment:', error);
      toast({
        status: 'error',
        title: 'Preview failed',
        description: error?.body?.message || error?.message || 'Could not preview the file. Please try again.'
      });
    }
  };

  // Service Request handlers
  // Removed: creation handled in component

  const loadVendors = useCallback(async () => {
    try {
      const vendorData = await getVendors();
      setVendors(vendorData);
    } catch (error) {
      console.error('Failed to load vendors:', error);
    }
  }, []);

  const ticketWatcherBg = useColorModeValue('gray.50', 'gray.700');
  const ticketWatcherHover = useColorModeValue('gray.100', 'gray.600');
  
  // Header colors
  const headerBg = useColorModeValue('gray.100', 'gray.700');
  const headerText = useColorModeValue('gray.800', 'gray.100');

  const [ticketType, setTicketType] = useState('user_request');
  const [formFields, setFormFields] = useState<any>({});
  const [typeId, setTypeId] = useState<number | undefined>(undefined);
  const [watchers, setWatchers] = useState<TicketWatcher[]>([]);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [addWatcherOpen, setAddWatcherOpen] = useState<boolean>(false);
  const [newWatcher, setNewWatcher] = useState<{ user_id?: number | null; name?: string; email?: string; watcher_type?: 'interested' | 'collaborator' | 'site_contact' | 'assignee_backup'; }>({ watcher_type: 'interested' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter assets based on search term
  const filteredAssets = useMemo(() => {
    return availableAssets.filter(asset => {
      if (!assetSearchTerm) return true;
      
      const searchLower = assetSearchTerm.toLowerCase();
      return (
        asset.asset_id.toString().includes(searchLower) ||
        asset.type.toLowerCase().includes(searchLower) ||
        (asset.model && asset.model.toLowerCase().includes(searchLower)) ||
        (asset.location && asset.location.toLowerCase().includes(searchLower)) ||
        (asset.serial && asset.serial.toLowerCase().includes(searchLower)) ||
        (asset.vendor_name && asset.vendor_name.toLowerCase().includes(searchLower))
      );
    });
  }, [availableAssets, assetSearchTerm]);

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
        
        // Load ticket assets if available
        if (t.assets) {
          setTicketAssets(t.assets);
        }
        
        // Load watchers list
        try {
          const ws = await getTicketWatchers(Number(id));
          setWatchers(ws);
        } catch (e: any) {
          console.warn('Failed to load watchers:', e?.message || e);
        }

        // Load attachments
        try {
          const attachmentData = await getTicketAttachments(Number(id));
          setAttachments(attachmentData as TicketAttachment[]);
        } catch (e: any) {
          console.warn('Failed to load attachments:', e?.message || e);
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
  // (Service requests now handled solely inside VendorServiceRequestsPanel)
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

  // Load assets when modal opens
  useEffect(() => {
    if (assetSearchOpen) {
      loadAvailableAssets();
    }
  }, [assetSearchOpen, loadAvailableAssets]);

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

  // Quick action handlers
  const handleAssignUser = async (userId: number | null) => {
    try {
      setSubmitting(true);
      await updateTicketFields(Number(id), { assignee_user_id: userId === null ? undefined : userId });
      await loadTicket(); // Refresh ticket data
      toast({ 
        status: 'success', 
        title: 'Assignment updated', 
        description: userId ? 'Ticket assigned successfully' : 'Ticket unassigned' 
      });
    } catch (e: any) {
      toast({ status: 'error', title: 'Failed to update assignment', description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCategoryChange = async (categoryId: number | null) => {
    try {
      setSubmitting(true);
      await updateTicketFields(Number(id), { category_id: categoryId === null ? undefined : categoryId });
      await loadTicket(); // Refresh ticket data
      toast({ 
        status: 'success', 
        title: 'Category updated', 
        description: 'Ticket category changed successfully' 
      });
    } catch (e: any) {
      toast({ status: 'error', title: 'Failed to update category', description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrivacyChange = async (privacyLevel: string) => {
    try {
      setSubmitting(true);
      await updateTicketFields(Number(id), { privacy_level: privacyLevel });
      await loadTicket(); // Refresh ticket data
      toast({ 
        status: 'success', 
        title: 'Privacy updated', 
        description: 'Ticket privacy level changed successfully' 
      });
    } catch (e: any) {
      toast({ status: 'error', title: 'Failed to update privacy', description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetReminder = async () => {
    if (!reminderDate || !reminderTime || !user?.id) {
      toast({ status: 'error', title: 'Invalid reminder', description: 'Please fill in all fields' });
      return;
    }

    try {
      setSubmitting(true);
      
      // Combine date and time
      const reminderDateTime = new Date(`${reminderDate}T${reminderTime}`);
      
      // Create reminder via API (we'll need to implement this endpoint)
      const reminder = {
        ticket_id: Number(id),
        user_id: Number(user.id),
        reminder_time: reminderDateTime.toISOString(),
        note: reminderNote || `Reminder for ticket #${ticket?.ticket_id}`,
        is_active: true
      };

      // For now, we'll store it using a generic API call
      // In the future, this should be a dedicated reminder endpoint
      await apiFetch('/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reminder)
      });

      setReminderOpen(false);
      setReminderDate('');
      setReminderTime('');
      setReminderNote('');
      
      toast({ 
        status: 'success', 
        title: 'Reminder set', 
        description: `You will be reminded on ${reminderDateTime.toLocaleDateString()} at ${reminderDateTime.toLocaleTimeString()}` 
      });
    } catch (e: any) {
      toast({ status: 'error', title: 'Failed to set reminder', description: e.message });
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

      // Enhanced check for duplicate watchers (including more robust validation)
      const existingWatcher = watchers?.find(w => {
        // Check by user_id if both have user_id
        if (newWatcher.user_id && w.user_id === newWatcher.user_id) {
          return true;
        }
        
        // Check by email (case-insensitive) if both have email
        if (newWatcher.email && w.email) {
          return w.email.toLowerCase().trim() === newWatcher.email.toLowerCase().trim();
        }
        
        // Check by name and type if both have names (exact match to avoid false positives)
        if (newWatcher.name && w.name) {
          return w.name.toLowerCase().trim() === newWatcher.name.toLowerCase().trim() &&
                 w.watcher_type === newWatcher.watcher_type;
        }
        
        return false;
      });

      if (existingWatcher) {
        toast({ 
          status: 'warning', 
          title: 'Contact already exists', 
          description: `${existingWatcher.user_name || existingWatcher.name || existingWatcher.email} is already watching this ticket as ${existingWatcher.watcher_type}.`
        });
        return;
      }

      setSubmitting(true);
      
      // Add the watcher
      await addTicketWatcher(Number(id), {
        user_id: newWatcher.user_id ?? null,
        name: newWatcher.name || null,
        email: newWatcher.email || null,
        watcher_type: newWatcher.watcher_type || 'interested'
      });
      
      // Refresh watchers list
      const ws = await getTicketWatchers(Number(id));
      setWatchers(ws);
      
      // Reset form and close modal
      setAddWatcherOpen(false);
      setNewWatcher({ watcher_type: 'interested' });
      
      toast({ status: 'success', title: 'Contact added successfully' });
    } catch (e: any) {
      // Enhanced error handling for specific error types
      if (e.message.includes('already exists') || e.message.includes('duplicate') || e.response?.status === 409) {
        toast({ 
          status: 'warning', 
          title: 'Contact already exists', 
          description: 'This contact is already watching this ticket. Try refreshing the page if you don\'t see them listed.'
        });
        
        // Refresh watchers list to ensure UI is up to date
        try {
          const ws = await getTicketWatchers(Number(id));
          setWatchers(ws);
        } catch (refreshError) {
          console.error('Failed to refresh watchers:', refreshError);
        }
      } else {
        toast({ status: 'error', title: 'Failed to add contact', description: e.message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleWatchTicket = async () => {
    if (!user?.id || !id) return;
    
    try {
      setSubmitting(true);
      
      // Check if user is already watching
      const isAlreadyWatching = watchers.some(w => w.user_id === Number(user.id));
      if (isAlreadyWatching) {
        toast({ 
          status: 'info', 
          title: 'Already watching', 
          description: 'You are already watching this ticket' 
        });
        return;
      }

      await addTicketWatcher(Number(id), {
        user_id: Number(user.id),
        name: user.profile?.full_name || null,
        email: user.email || null,
        watcher_type: 'interested'
      });
      
      // Refresh watchers list
      const ws = await getTicketWatchers(Number(id));
      setWatchers(ws);
      
      toast({ 
        status: 'success', 
        title: 'Now watching ticket', 
        description: 'You will receive notifications about this ticket' 
      });
    } catch (e: any) {
      if (e.message.includes('already exists') || e.message.includes('duplicate') || e.response?.status === 409) {
        toast({ 
          status: 'info', 
          title: 'Already watching', 
          description: 'You are already watching this ticket' 
        });
      } else {
        toast({ 
          status: 'error', 
          title: 'Failed to watch ticket', 
          description: e.message 
        });
      }
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
        // Double check that user isn't already watching before adding
        const existingWatcher = watchers?.find(w => w.user_id === uid && w.is_active);
        if (existingWatcher) {
          toast({ status: 'info', title: 'Already watching', description: 'You are already watching this ticket.' });
          return;
        }
        
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

  const getRoleColor = (role: 'assignee' | 'site_contact' | 'interested' | 'assignee_backup' | string) => {
    switch (role?.toLowerCase()) {
      case 'assignee': return 'purple';
      case 'site_contact': return 'green';
      case 'assignee_backup': return 'orange';
      case 'interested': return 'gray';
      default: return 'gray';
    }
  };

  const getRoleLabel = (role: 'assignee' | 'site_contact' | 'interested' | 'assignee_backup' | string) => {
    switch (role?.toLowerCase()) {
      case 'assignee': return 'Assignee';
      case 'site_contact': return 'Site Contact';
      case 'assignee_backup': return 'Backup Assignee';
      case 'interested': return 'Interested';
      default: return role || 'Contact';
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
              {/* WebSocket Status */}
              <Box>
                <WebSocketStatus variant="detailed" />
              </Box>
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
                              <RichTextEditor
                                value={editMode ? (editValues.description || '') : (ticket.description || '')}
                                onChange={(value) => setEditValues({...editValues, description: value})}
                                readOnly={!editMode}
                                placeholder="Enter detailed description using Markdown formatting..."
                                minHeight="250px"
                              />
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

              {/* Asset Management */}
              <Card bg={cardBg} shadow="lg" borderColor={borderColor}>
                <CardHeader bg={headerBg} borderTopRadius="md">
                  <Flex justify="space-between" align="center">
                    <Heading size="sm" color={headerText}>Asset Management</Heading>
                    <Button 
                      size="xs" 
                      variant="outline" 
                      colorScheme="blue" 
                      onClick={() => {
                        setAssetSearchTerm('');
                        setSelectedAsset(null);
                        setAssetSearchOpen(true);
                      }}
                    >
                      Link Asset
                    </Button>
                  </Flex>
                </CardHeader>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    {/* Linked Assets */}
                    <Box>
                      <Text fontSize="md" fontWeight="bold" color={textPrimary} mb={3}>
                        Linked Assets {ticketAssets.length > 0 && `(${ticketAssets.length})`}
                      </Text>
                      {ticketAssets.length > 0 ? (
                        <VStack spacing={3} align="stretch">
                          {ticketAssets.map((asset) => (
                            <Card 
                              key={asset.asset_id} 
                              bg={assetStatusUpdate.asset_id === asset.asset_id ? 'blue.50' : ticketWatcherBg} 
                              borderRadius="md" 
                              p={3} 
                                                           variant="outline"
                              borderColor={assetStatusUpdate.asset_id === asset.asset_id ? 'blue.400' : undefined}
                              cursor="pointer"
                              onClick={() => {
                                setAssetStatusUpdate({
                                  asset_id: asset.asset_id,
                                  status: normalizeAssetStatus(asset.status),
                                  notes: assetNotesMap[asset.asset_id] || ''
                                });
                              }}
                            >
                              <HStack justify="space-between" align="start">
                                <HStack spacing={3} flex={1}>
                                  <Text fontSize="2xl">{getAssetTypeIcon(asset.type)}</Text>
                                  <Box flex={1}>
                                    <HStack align="center" spacing={2} mb={1}>
                                      <Text fontSize="md" fontWeight="semibold" color={textPrimary}>
                                        Asset #{asset.asset_id}
                                      </Text>
                                      <Badge colorScheme={getAssetStatusColor(asset.type)} size="sm">
                                        {asset.type.toUpperCase()}
                                      </Badge>
                                      {asset.status && (
                                        <Badge colorScheme={getAssetStatusColor(asset.status)} size="sm" variant="subtle">
                                          {asset.status}
                                        </Badge>
                                      )}
                                    </HStack>
                                    <Text fontSize="sm" color={textSecondary} mb={1}>
                                      {asset.model && `Model: ${asset.model} • `}
                                      {asset.location || 'Location not specified'}
                                    </Text>
                                    {asset.vendor_name && (
                                      <Text fontSize="sm" color={textSecondary}>
                                        Vendor: {asset.vendor_name}
                                      </Text>
                                    )}
                                  </Box>
                                                               </HStack>
                                <VStack align="end" spacing={2}>
                                  <Button 
                                    size="xs" 
                                    variant="outline" 
                                    colorScheme="blue"
                                    onClick={(e) => { e.stopPropagation(); handleViewAssetDetails(asset.asset_id); }}
                                  >
                                    View Details
                                  </Button>
                                                                   <Button 
                                    size="xs" 
                                                                       variant="ghost" 
                                    
                                    colorScheme="red"
                                    onClick={(e) => { e.stopPropagation(); handleTicketAssetUnlink(asset.asset_id); }}
                                  >
                                    Unlink
                                  </Button>
                                </VStack>
                              </HStack>
                            </Card>
                          ))}
                        </VStack>
                      ) : (
                        <Text color={textPrimary} fontSize="md" fontStyle="italic" textAlign="center" py={4}>
                          No assets linked. Click &quot;Link Asset&quot; to connect equipment to this ticket.
                        </Text>
                      )}
                    </Box>

                    <Divider />

                    {/* Asset Status Update */}
                    <Box>
                      <Text fontSize="md" fontWeight="bold" color={textPrimary} mb={3}>
                        Asset Status Update
                      </Text>
                      <VStack spacing={3} align="stretch">
                        <FormControl>
                          <FormLabel color={textSecondary}>Asset</FormLabel>
                          <Select 
                            value={assetStatusUpdate.asset_id || ''} 
                            onChange={async (e) => {
                              const newId = Number(e.target.value) || undefined;
                              if (!newId) {
                                setAssetStatusUpdate({ ...assetStatusUpdate, asset_id: undefined });
                                return;
                              }
                              const selected = ticketAssets.find(a => a.asset_id === newId);
                              
                              // Load asset notes from database
                              let notes = '';
                              try {
                                const maintenance = await getAssetMaintenanceNotes(newId);
                                notes = maintenance.notes || '';
                                setAssetNotesMap(prev => ({ ...prev, [newId]: notes }));
                              } catch (error) {
                                console.error('Failed to load asset maintenance notes:', error);
                                // Fallback to any existing notes in the map
                                notes = assetNotesMap[newId] || '';
                              }
                              
                              setAssetStatusUpdate({ 
                                ...assetStatusUpdate, 
                                asset_id: newId, 
                                status: normalizeAssetStatus(selected?.status),
                                notes
                              });
                            }}
                            placeholder="Select an asset to update"
                          >
                            {ticketAssets.map(asset => (
                              <option key={asset.asset_id} value={asset.asset_id}>
                                Asset #{asset.asset_id} - {asset.model || asset.type}
                              </option>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl>
                          <FormLabel color={textSecondary}>New Status</FormLabel>
                          <Select 
                            value={assetStatusUpdate.status} 
                            onChange={(e) => setAssetStatusUpdate({ ...assetStatusUpdate, status: e.target.value })}
                          >
                            <option value="operational">Operational</option>
                            <option value="warning">Warning</option>
                            <option value="critical">Critical</option>
                            <option value="maintenance">Under Maintenance</option>
                            <option value="offline">Offline</option>
                          </Select>
                        </FormControl>
                        <FormControl>
                          <FormLabel color={textSecondary}>Notes</FormLabel>
                          <Textarea 
                            rows={3} 
                            value={assetStatusUpdate.notes} 
                            onChange={(e) => setAssetStatusUpdate({ ...assetStatusUpdate, notes: e.target.value })} 
                            placeholder="Describe the status change or any relevant details"
                          />
                        </FormControl>
                        <HStack justify="flex-end">
                          <Button
                            size="sm"
                            colorScheme="green"
                            isDisabled={!assetStatusUpdate.asset_id}
                            onClick={handleUpdateAssetStatus}
                          >
                            Update Status
                          </Button>
                        </HStack>
                      </VStack>
                    </Box>

                    <Divider />

                    {/* Knowledge & Documentation */}
                    <Box>
                      <Text fontSize="md" fontWeight="bold" color={textPrimary} mb={3}>
                        Knowledge & Documentation
                      </Text>
                      <VStack spacing={3} align="stretch">
                        <HStack spacing={2}>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            colorScheme="blue" 
                            flex={1}
                            onClick={handleViewAssetManuals}
                          >
                            📚 View Asset Manuals
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            colorScheme="green" 
                            flex={1}
                            onClick={handleMaintenanceHistory}
                          >
                            🔧 Maintenance History
                          </Button>
                        </HStack>
                        <HStack spacing={2}>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            colorScheme="purple" 
                            flex={1}
                            onClick={handleKnowledgeBase}
                          >
                            📋 Knowledge Base
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            colorScheme="orange" 
                            flex={1}
                            onClick={handleAssetAnalytics}
                          >
                            📊 Asset Analytics
                          </Button>
                        </HStack>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          colorScheme="teal" 
                          w="full"
                          onClick={handleAddDocumentation}
                        >
                          ➕ Add Documentation
                        </Button>
                      </VStack>
                    </Box>

                    <Divider />

                    {/* Service Request Management */}
                    <VendorServiceRequestsPanel ticketId={Number(id)} vendors={vendors} />
                  </VStack>
                </CardBody>
              </Card>

              {/* Add Watcher Modal */}
              <Modal isOpen={addWatcherOpen} onClose={() => setAddWatcherOpen(false)}>
                <ModalOverlay />
                <ModalContent>
                  <ModalHeader>Add Contact</ModalHeader>
                  <ModalCloseButton />
                  <ModalBody pb={6}>
                    <VStack align="stretch" spacing={4}>
                      <Text fontSize="sm" color={textSecondary}>Select an existing user or enter name and email for an external contact.</Text>
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
                          onChange={(opt: any) => {
                            const selectedUser = opt ? metadata?.users.find(u => u.user_id === Number(opt.value)) : null;
                            setNewWatcher({ 
                              ...newWatcher, 
                              user_id: opt ? Number(opt.value) : null,
                              // Clear external fields when user is selected, or populate from user when available
                              name: selectedUser ? selectedUser.name : (opt ? '' : newWatcher.name),
                              email: selectedUser ? selectedUser.email : (opt ? '' : newWatcher.email)
                            });
                          }}
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
                        <FormLabel>Contact Type</FormLabel>
                        <Select value={newWatcher.watcher_type} onChange={(e) => setNewWatcher({ ...newWatcher, watcher_type: e.target.value as any })}>
                          <option value="interested">Interested</option>
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

              {/* Asset Search Modal */}
              <Modal isOpen={assetSearchOpen} onClose={() => setAssetSearchOpen(false)} size="xl" initialFocusRef={assetSearchInputRef}>
                <ModalOverlay />
                <ModalContent bg={cardBg}>
                  <ModalHeader color={headerText}>Link Asset to Ticket</ModalHeader>
                  <ModalCloseButton />
                  <ModalBody>
                    <VStack spacing={4} align="stretch">
                      <Box>
                        <Text fontSize="sm" color={textSecondary} mb={2}>Search and select an asset to link to this ticket</Text>
                        <Text fontSize="xs" color="blue.500" mb={1}>Debug: Search term = &quot;{assetSearchTerm}&quot;</Text>
                        <Input 
                          ref={assetSearchInputRef}
                          placeholder="🔍 Search assets by ID, model, location..."
                          value={assetSearchTerm || ''}
                          onChange={(e) => {
                            console.log('Input onChange:', e.target.value);
                            setAssetSearchTerm(e.target.value);
                          }}
                          onFocus={() => console.log('Input focused')}
                          onKeyDown={(e) => console.log('Key pressed:', e.key)}
                          autoFocus
                          bg="white"
                          borderColor="gray.300"
                          _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                        />
                      </Box>

                      <Box maxH="400px" overflowY="auto">
                        {assetSearchLoading ? (
                          <VStack spacing={4} py={8}>
                            <Spinner size="md" color="blue.500" />
                            <Text color={textSecondary}>Loading assets...</Text>
                          </VStack>
                        ) : (
                          <VStack spacing={2} align="stretch">
                            {filteredAssets.length > 0 ? filteredAssets.map((asset) => (
                            <Card 
                              key={asset.asset_id} 
                              variant="outline" 
                              cursor="pointer" 
                              _hover={{ bg: ticketWatcherBg }}
                              onClick={() => setSelectedAsset(asset)}
                              bg={selectedAsset?.asset_id === asset.asset_id ? ticketWatcherBg : 'transparent'}
                              borderColor={selectedAsset?.asset_id === asset.asset_id ? 'blue.400' : borderColor}
                            >
                              <CardBody p={3}>
                                <HStack spacing={3}>
                                  <Text fontSize="2xl">{getAssetTypeIcon(asset.type)}</Text>
                                  <Box flex={1}>
                                    <HStack align="center" spacing={2} mb={1}>
                                      <Text fontSize="md" fontWeight="semibold" color={textPrimary}>
                                        Asset #{asset.asset_id}
                                      </Text>
                                      <Badge colorScheme={getAssetStatusColor(asset.type)} size="sm">
                                        {asset.type.toUpperCase()}
                                      </Badge>
                                      {asset.status && (
                                        <Badge colorScheme={getAssetStatusColor(asset.status)} size="sm" variant="subtle">
                                          {asset.status}
                                        </Badge>
                                      )}
                                    </HStack>
                                    <Text fontSize="sm" color={textSecondary}>
                                      {asset.model && `Model: ${asset.model} • `}
                                      {asset.location || 'Location not specified'}
                                    </Text>
                                  </Box>
                                </HStack>
                              </CardBody>
                            </Card>
                          )) : (
                            <Text color={textSecondary} textAlign="center" py={8}>
                              No assets found. Try adjusting your search terms.
                            </Text>
                          )}
                          </VStack>
                        )}
                      </Box>
                    </VStack>
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={() => setAssetSearchOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      colorScheme="blue" 
                      isDisabled={!selectedAsset}
                      onClick={async () => {
                        if (selectedAsset && id) {
                          try {
                            await linkAssetToTicket(Number(id), selectedAsset.asset_id);
                            setTicketAssets([...ticketAssets, selectedAsset]);
                            setSelectedAsset(null);
                            setAssetSearchOpen(false);
                            toast({ 
                              status: 'success', 
                              title: 'Asset linked successfully',
                              description: `Asset #${selectedAsset.asset_id} has been linked to this ticket`
                            });
                          } catch (error: any) {
                            toast({ 
                              status: 'error', 
                              title: 'Failed to link asset', 
                              description: error.message 
                            });
                          }
                        }
                      }}
                    >
                      Link Asset
                    </Button>
                  </ModalFooter>
                </ModalContent>
              </Modal>

              {/* Service request modal & history handled inside component */}
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
                  <VStack spacing={4} align="stretch">
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
                        
                        <Divider />
                        
                        {/* Assign To Dropdown */}
                        <VStack align="stretch" spacing={2}>
                          <Text fontSize="xs" color={textSecondary} fontWeight="semibold">ASSIGN TO</Text>
                          <ChakraSelect
                            useBasicStyles
                            isSearchable
                            selectedOptionStyle="check"
                            colorScheme="blue"
                            size="sm"
                            value={
                              ticket.assignee_user_id
                                ? metadata?.users.map(u => ({ label: u.name, value: u.user_id })).find(o => o.value === ticket.assignee_user_id) || null
                                : null
                            }
                            onChange={(opt: any) => handleAssignUser(opt ? opt.value : null)}
                            options={metadata?.users.map(u => ({ label: u.name, value: u.user_id })) || []}
                            placeholder="Select user..."
                            isClearable
                            isLoading={submitting}
                          />
                        </VStack>
                        
                        {/* Category Dropdown */}
                        <VStack align="stretch" spacing={2}>
                          <Text fontSize="xs" color={textSecondary} fontWeight="semibold">CATEGORY</Text>
                          <ChakraSelect
                            useBasicStyles
                            isSearchable
                            selectedOptionStyle="check"
                            colorScheme="blue"
                            size="sm"
                            value={
                              ticket.category_id
                                ? metadata?.categories.map(c => ({ label: c.name, value: c.category_id })).find(o => o.value === ticket.category_id) || null
                                : null
                            }
                            onChange={(opt: any) => handleCategoryChange(opt ? opt.value : null)}
                            options={metadata?.categories.map(c => ({ label: c.name, value: c.category_id })) || []}
                            placeholder="Select category..."
                            isClearable
                            isLoading={submitting}
                          />
                        </VStack>
                        
                        {/* Privacy Level Dropdown */}
                        <VStack align="stretch" spacing={2}>
                          <Text fontSize="xs" color={textSecondary} fontWeight="semibold">PRIVACY LEVEL</Text>
                          <ChakraSelect
                            useBasicStyles
                            selectedOptionStyle="check"
                            colorScheme="blue"
                            size="sm"
                            value={
                              ticket.privacy_level
                                ? { label: ticket.privacy_level === 'public' ? 'Public' : ticket.privacy_level === 'site_only' ? 'Site Only' : 'Private', value: ticket.privacy_level }
                                : { label: 'Public', value: 'public' }
                            }
                            onChange={(opt: any) => handlePrivacyChange(opt.value)}
                            options={[
                              { label: 'Public', value: 'public' },
                              { label: 'Site Only', value: 'site_only' },
                              { label: 'Private', value: 'private' }
                            ]}
                            isLoading={submitting}
                          />
                        </VStack>
                        
                        <Divider />
                        
                        <Button 
                          colorScheme="green" 
                          variant="outline" 
                          size="sm"
                          leftIcon={<Icon as={EyeIcon} />}
                          onClick={handleWatchTicket}
                          isLoading={submitting}
                        >
                          Watch Ticket
                        </Button>
                        <Button 
                          colorScheme="orange" 
                          variant="outline" 
                          size="sm"
                          leftIcon={<Icon as={ClockIcon} />}
                          onClick={() => setReminderOpen(true)}
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
                  <Flex justify="space-between" align="center">
                    <Heading size="sm" color={textPrimary}>Watchers</Heading>
                    <Badge colorScheme="blue" variant="subtle">{watchers.length}</Badge>
                  </Flex>
                </CardHeader>
                <CardBody>
                  <VStack spacing={3} align="stretch">
                    {watchers.length > 0 ? (
                      watchers.map((watcher) => (
                        <HStack key={watcher.watcher_id} justify="space-between" p={2} bg="gray.50" borderRadius="md">
                          <VStack align="start" spacing={0} flex={1}>
                            <Text fontSize="sm" fontWeight="semibold" color={textPrimary}>
                              {watcher.name || 'Unknown'}
                            </Text>
                            <Text fontSize="xs" color={textSecondary}>
                              {watcher.email}
                            </Text>
                            <Badge size="xs" colorScheme="blue" variant="subtle">
                              {watcher.watcher_type}
                            </Badge>
                          </VStack>
                          <IconButton
                            size="xs"
                            variant="ghost"
                            colorScheme="red"
                            icon={<XMarkIcon />}
                            onClick={() => handleRemoveWatcher(watcher.watcher_id)}
                            aria-label="Remove watcher"
                          />
                        </HStack>
                      ))
                    ) : (
                      <Text color={textSecondary} fontSize="sm" textAlign="center">
                        No watchers yet
                      </Text>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      colorScheme="blue"
                      onClick={() => setAddWatcherOpen(true)}
                    >
                      Add Watcher
                    </Button>
                  </VStack>
                </CardBody>
              </Card>

              {/* Attachments */}
              <Card bg={cardBg} shadow="lg" borderColor={borderColor}>
                <CardHeader bg="gray.50" borderTopRadius="md">
                  <Flex justify="space-between" align="center">
                    <Heading size="sm" color={textPrimary}>Attachments</Heading>
                    <Badge colorScheme="blue" variant="subtle">{attachments.length}</Badge>
                  </Flex>
                </CardHeader>
                <CardBody>
                  <VStack spacing={3} align="stretch">
                    {attachmentsLoading ? (
                      <VStack spacing={2}>
                        <Spinner size="sm" />
                        <Text fontSize="sm" color={textSecondary}>Loading attachments...</Text>
                      </VStack>
                    ) : attachments.length > 0 ? (
                      attachments.map((attachment) => (
                        <HStack key={attachment.attachment_id} justify="space-between" p={2} bg="gray.50" borderRadius="md">
                          <VStack align="start" spacing={0} flex={1}>
                            <Text fontSize="sm" fontWeight="semibold" color={textPrimary} noOfLines={1}>
                              {attachment.original_filename}
                            </Text>
                            <Text fontSize="xs" color={textSecondary}>
                              {attachment.file_size ? `${Math.round(attachment.file_size / 1024)} KB` : 'Unknown size'}
                            </Text>
                          </VStack>
                          <HStack spacing={1}>
                            <Tooltip label="Preview">
                              <IconButton
                                size="xs"
                                variant="ghost"
                                colorScheme="blue"
                                icon={<EyeIcon />}
                                onClick={() => handlePreviewAttachment(attachment.attachment_id, attachment.original_filename, attachment.mime_type)}
                                aria-label="Preview attachment"
                              />
                            </Tooltip>
                            <Tooltip label="Download">
                              <IconButton
                                size="xs"
                                variant="ghost"
                                colorScheme="green"
                                icon={<ArrowDownTrayIcon />}
                                onClick={() => handleDownloadAttachment(attachment.attachment_id, attachment.original_filename)}
                                aria-label="Download attachment"
                              />
                            </Tooltip>
                            <Tooltip label="Delete">
                              <IconButton
                                size="xs"
                                variant="ghost"
                                colorScheme="red"
                                icon={<XMarkIcon />}
                                onClick={() => handleDeleteAttachment(attachment.attachment_id)}
                                aria-label="Delete attachment"
                              />
                            </Tooltip>
                          </HStack>
                        </HStack>
                      ))
                    ) : (
                      <Text color={textSecondary} fontSize="sm" textAlign="center">
                        No attachments yet
                      </Text>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      colorScheme="blue"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload File
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </VStack>
          </Grid>
          
          {/* Hidden file input for attachment uploads */}
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov,.txt,.xls,.xlsx,.ppt,.pptx"
          />
          
          {/* Reminder Modal */}
          <Modal isOpen={reminderOpen} onClose={() => setReminderOpen(false)}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Set Reminder</ModalHeader>
              <ModalCloseButton />
              <ModalBody pb={6}>
                <VStack align="stretch" spacing={4}>
                  <Text fontSize="sm" color={textSecondary}>
                    Set a reminder for ticket #{ticket?.ticket_id}. You will receive a notification at the specified time.
                  </Text>
                  
                  <FormControl isRequired>
                    <FormLabel>Reminder Date</FormLabel>
                    <Input 
                      type="date" 
                      value={reminderDate} 
                      onChange={(e) => setReminderDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]} // Don't allow past dates
                    />
                  </FormControl>
                  
                  <FormControl isRequired>
                    <FormLabel>Reminder Time</FormLabel>
                    <Input 
                      type="time" 
                      value={reminderTime} 
                      onChange={(e) => setReminderTime(e.target.value)}
                    />
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>Note (optional)</FormLabel>
                    <Textarea 
                      value={reminderNote} 
                      onChange={(e) => setReminderNote(e.target.value)}
                      placeholder="Add a note about what to remember..."
                      rows={3}
                    />
                  </FormControl>
                  
                  {reminderDate && reminderTime && (
                    <Box p={3} bg="blue.50" borderRadius="md" borderColor="blue.200" borderWidth="1px">
                      <Text fontSize="sm" color="blue.700" fontWeight="semibold">
                        Reminder Preview:
                      </Text>
                      <Text fontSize="sm" color="blue.600">
                        {new Date(`${reminderDate}T${reminderTime}`).toLocaleDateString()} at {new Date(`${reminderDate}T${reminderTime}`).toLocaleTimeString()}
                      </Text>
                    </Box>
                  )}
                </VStack>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" mr={3} onClick={() => setReminderOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  colorScheme="orange" 
                  onClick={handleSetReminder}
                  isLoading={submitting}
                  isDisabled={!reminderDate || !reminderTime}
                >
                  Set Reminder
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </Container>
      </Box>
    </AppLayout>
  );
}


function relativeTime(dateIso: string) {
  const d = new Date(dateIso);
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff/1000);
  if (sec < 60) return sec + 's ago';
  const min = Math.floor(sec/60); if (min < 60) return min + 'm ago';
  const hr = Math.floor(min/60); if (hr < 24) return hr + 'h ago';
  const day = Math.floor(hr/24); return day + 'd ago';
}

// Persistence for vendor notes map
// Removed vendor notes persistence (handled in component)
