import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  VStack,
  HStack,
  Button,
  Badge,
  Box,
  Text,
  IconButton,
  Alert,
  AlertIcon,
  Divider,
  Tag,
  TagLabel,
  TagCloseButton,
  RadioGroup,
  Radio,
  Stack,
  Tooltip,
  useToast,
  useColorModeValue
} from '@chakra-ui/react';
import { 
  PlusIcon, 
  EyeIcon, 
  EyeSlashIcon, 
  LockClosedIcon,
  UsersIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import { 
  createTicket, 
  getPrivacyLevels, 
  getSubstatuses,
  CreateTicketPayload,
  PrivacyLevel,
  Substatus 
} from '../../lib/api/tickets';
import { User } from '../../lib/api/users';
import { UserDropdown } from '../shared/UserDropdown';

interface TicketFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (ticketId: number) => void;
  siteId?: number;
}

interface WatcherInput {
  id: string;
  user_id?: number;
  email?: string;
  name?: string;
  watcher_type: 'interested' | 'collaborator' | 'site_contact';
}

export const TicketFormModal: React.FC<TicketFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  siteId
}) => {
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Form state
  const [formData, setFormData] = useState<CreateTicketPayload>({
    summary: '',
    description: '',
    status: 'Open',
    substatus_code: 'awaiting_assignment',
    severity: 2,
    category_id: undefined,
    site_id: siteId,
    privacy_level: 'public',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    problem_description: '',
    watchers: []
  });

  const [assigneeUser, setAssigneeUser] = useState<User | null>(null);
  const [watchers, setWatchers] = useState<WatcherInput[]>([]);
  const [watcherInput, setWatcherInput] = useState<{
    email: string;
    name: string;
    watcher_type: 'interested' | 'collaborator' | 'site_contact';
  }>({
    email: '',
    name: '',
    watcher_type: 'interested'
  });
  const [watcherMode, setWatcherMode] = useState<'user' | 'manual'>('user');
  const [selectedWatcherUser, setSelectedWatcherUser] = useState<User | null>(null);

  // Data state
  const [privacyLevels, setPrivacyLevels] = useState<PrivacyLevel[]>([]);
  const [substatuses, setSubstatuses] = useState<Record<string, Substatus[]>>({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Load reference data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [privacyData, substatusData] = await Promise.all([
          getPrivacyLevels(),
          getSubstatuses()
        ]);
        setPrivacyLevels(privacyData);
        setSubstatuses(substatusData);
      } catch (error) {
        console.error('Failed to load reference data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load form data',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoadingData(false);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen, toast]);

  const handleInputChange = (field: keyof CreateTicketPayload, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addWatcher = () => {
    if (watcherMode === 'user') {
      if (!selectedWatcherUser) return;
      
      const newWatcher: WatcherInput = {
        id: Date.now().toString(),
        user_id: selectedWatcherUser.user_id,
        email: selectedWatcherUser.email,
        name: selectedWatcherUser.name,
        watcher_type: 'interested'
      };
      
      setWatchers(prev => [...prev, newWatcher]);
      setSelectedWatcherUser(null);
    } else {
      if (!watcherInput.email || !watcherInput.name) return;
      
      const newWatcher: WatcherInput = {
        id: Date.now().toString(),
        email: watcherInput.email,
        name: watcherInput.name,
        watcher_type: watcherInput.watcher_type
      };
      
      setWatchers(prev => [...prev, newWatcher]);
      setWatcherInput({ email: '', name: '', watcher_type: 'interested' });
    }
  };

  const removeWatcher = (id: string) => {
    setWatchers(prev => prev.filter(w => w.id !== id));
  };

  const handleSubmit = async () => {
    if (!formData.summary.trim()) {
      toast({
        title: 'Error',
        description: 'Summary is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    try {
      const payload: CreateTicketPayload = {
        ...formData,
        assignee_user_id: assigneeUser?.user_id,
        watchers: watchers.map(w => ({
          user_id: w.user_id || null,
          email: w.email || null,
          name: w.name || null,
          watcher_type: w.watcher_type
        }))
      };

      const result = await createTicket(payload);
      
      toast({
        title: 'Success',
        description: 'Ticket created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onSuccess?.(result.ticket_id);
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create ticket',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const getPrivacyIcon = (level: string) => {
    switch (level) {
      case 'public': return <EyeIcon className="w-4 h-4" />;
      case 'site_only': return <UsersIcon className="w-4 h-4" />;
      case 'private': return <LockClosedIcon className="w-4 h-4" />;
      default: return <EyeIcon className="w-4 h-4" />;
    }
  };

  const getPrivacyColor = (level: string) => {
    switch (level) {
      case 'public': return 'green';
      case 'site_only': return 'blue';
      case 'private': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent bg={bgColor}>
        <ModalHeader>Create New Ticket</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          {loadingData ? (
            <Text>Loading form data...</Text>
          ) : (
            <VStack spacing={4} align="stretch">
              {/* Basic Information */}
              <Box>
                <Text fontSize="lg" fontWeight="semibold" mb={3}>Basic Information</Text>
                
                <VStack spacing={3} align="stretch">
                  <FormControl isRequired>
                    <FormLabel>Summary</FormLabel>
                    <Input
                      value={formData.summary}
                      onChange={(e) => handleInputChange('summary', e.target.value)}
                      placeholder="Brief description of the issue"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Problem Description</FormLabel>
                    <Textarea
                      value={formData.problem_description || ''}
                      onChange={(e) => handleInputChange('problem_description', e.target.value)}
                      placeholder="Detailed description of the problem for AI assistance"
                      rows={3}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Additional Description</FormLabel>
                    <Textarea
                      value={formData.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Additional context and details"
                      rows={2}
                    />
                  </FormControl>

                  <HStack spacing={3}>
                    <FormControl>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={formData.status}
                        onChange={(e) => {
                          handleInputChange('status', e.target.value);
                          // Reset substatus when status changes
                          const firstSubstatus = substatuses[e.target.value]?.[0];
                          if (firstSubstatus) {
                            handleInputChange('substatus_code', firstSubstatus.substatus_code);
                          }
                        }}
                      >
                        {Object.keys(substatuses).map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Substatus</FormLabel>
                      <Select
                        value={formData.substatus_code || ''}
                        onChange={(e) => handleInputChange('substatus_code', e.target.value)}
                      >
                        {(substatuses[formData.status as keyof typeof substatuses] || []).map((substatus: Substatus) => (
                          <option key={substatus.substatus_code} value={substatus.substatus_code}>
                            {substatus.substatus_name}
                          </option>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Severity</FormLabel>
                      <Select
                        value={formData.severity}
                        onChange={(e) => handleInputChange('severity', parseInt(e.target.value))}
                      >
                        <option value={1}>1 - Low</option>
                        <option value={2}>2 - Medium</option>
                        <option value={3}>3 - High</option>
                        <option value={4}>4 - Critical</option>
                        <option value={5}>5 - Emergency</option>
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Assignee</FormLabel>
                      <UserDropdown
                        value={assigneeUser}
                        onChange={setAssigneeUser}
                        placeholder="Search for assignee..."
                      />
                    </FormControl>
                  </HStack>
                </VStack>
              </Box>

              <Divider />

              {/* Contact Information */}
              <Box>
                <Text fontSize="lg" fontWeight="semibold" mb={3}>Contact Information</Text>
                
                <HStack spacing={3}>
                  <FormControl>
                    <FormLabel>Contact Name</FormLabel>
                    <Input
                      value={formData.contact_name || ''}
                      onChange={(e) => handleInputChange('contact_name', e.target.value)}
                      placeholder="Primary contact person"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Contact Email</FormLabel>
                    <Input
                      type="email"
                      value={formData.contact_email || ''}
                      onChange={(e) => handleInputChange('contact_email', e.target.value)}
                      placeholder="contact@example.com"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Contact Phone</FormLabel>
                    <Input
                      value={formData.contact_phone || ''}
                      onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                      placeholder="Phone number"
                    />
                  </FormControl>
                </HStack>
              </Box>

              <Divider />

              {/* Privacy Settings */}
              <Box>
                <Text fontSize="lg" fontWeight="semibold" mb={3}>Privacy Settings</Text>
                
                <FormControl>
                  <FormLabel>Privacy Level</FormLabel>
                  <RadioGroup
                    value={formData.privacy_level}
                    onChange={(value) => handleInputChange('privacy_level', value)}
                  >
                    <Stack spacing={3}>
                      {privacyLevels.map(level => (
                        <Radio key={level.privacy_level} value={level.privacy_level}>
                          <HStack spacing={2}>
                            <Box color={`${getPrivacyColor(level.privacy_level)}.500`}>
                              {getPrivacyIcon(level.privacy_level)}
                            </Box>
                            <Text fontWeight="medium">{level.display_name}</Text>
                            <Text fontSize="sm" color="gray.600">{level.description}</Text>
                          </HStack>
                        </Radio>
                      ))}
                    </Stack>
                  </RadioGroup>
                </FormControl>
              </Box>

              <Divider />

              {/* Watchers */}
              <Box>
                <Text fontSize="lg" fontWeight="semibold" mb={3}>Watchers</Text>
                
                {watchers.length > 0 && (
                  <VStack spacing={2} align="stretch" mb={3}>
                    {watchers.map(watcher => (
                      <HStack key={watcher.id} p={2} bg="gray.50" borderRadius="md">
                        <VStack align="start" spacing={0} flex={1}>
                          <Text fontSize="sm" fontWeight="medium">{watcher.name}</Text>
                          <Text fontSize="xs" color="gray.600">{watcher.email}</Text>
                        </VStack>
                        <Badge colorScheme={watcher.watcher_type === 'collaborator' ? 'blue' : 'gray'}>
                          {watcher.watcher_type}
                        </Badge>
                        {watcher.user_id && (
                          <Badge colorScheme="green" variant="subtle">
                            User
                          </Badge>
                        )}
                        <IconButton
                          aria-label="Remove watcher"
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          icon={<XMarkIcon className="w-4 h-4" />}
                          onClick={() => removeWatcher(watcher.id)}
                        />
                      </HStack>
                    ))}
                  </VStack>
                )}

                <Box p={3} border="1px" borderColor={borderColor} borderRadius="md">
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Add Watcher</Text>
                  
                  <RadioGroup 
                    value={watcherMode} 
                    onChange={(value) => setWatcherMode(value as 'user' | 'manual')}
                    mb={3}
                  >
                    <Stack direction="row" spacing={4}>
                      <Radio value="user">Select User</Radio>
                      <Radio value="manual">Manual Entry</Radio>
                    </Stack>
                  </RadioGroup>

                  {watcherMode === 'user' ? (
                    <VStack spacing={2}>
                      <HStack spacing={2} w="full">
                        <Box flex={1}>
                          <UserDropdown
                            value={selectedWatcherUser}
                            onChange={setSelectedWatcherUser}
                            placeholder="Select watcher..."
                          />
                        </Box>
                        <IconButton
                          aria-label="Add watcher"
                          size="sm"
                          colorScheme="blue"
                          icon={<PlusIcon className="w-4 h-4" />}
                          onClick={addWatcher}
                          isDisabled={!selectedWatcherUser}
                        />
                      </HStack>
                    </VStack>
                  ) : (
                    <VStack spacing={2}>
                      <HStack spacing={2} w="full">
                        <Input
                          placeholder="Name"
                          value={watcherInput.name}
                          onChange={(e) => setWatcherInput(prev => ({ ...prev, name: e.target.value }))}
                          size="sm"
                        />
                        <Input
                          placeholder="Email"
                          type="email"
                          value={watcherInput.email}
                          onChange={(e) => setWatcherInput(prev => ({ ...prev, email: e.target.value }))}
                          size="sm"
                        />
                        <Select
                          value={watcherInput.watcher_type}
                          onChange={(e) => setWatcherInput(prev => ({ 
                            ...prev, 
                            watcher_type: e.target.value as 'interested' | 'collaborator' | 'site_contact' 
                          }))}
                          size="sm"
                          w="120px"
                        >
                          <option value="interested">Interested</option>
                          <option value="collaborator">Collaborator</option>
                          <option value="site_contact">Site Contact</option>
                        </Select>
                        <IconButton
                          aria-label="Add watcher"
                          size="sm"
                          colorScheme="blue"
                          icon={<PlusIcon className="w-4 h-4" />}
                          onClick={addWatcher}
                          isDisabled={!watcherInput.email || !watcherInput.name}
                        />
                      </HStack>
                    </VStack>
                  )}
                </Box>
              </Box>
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button 
            colorScheme="blue" 
            onClick={handleSubmit} 
            isLoading={loading}
            isDisabled={loadingData || !formData.summary.trim()}
          >
            Create Ticket
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
