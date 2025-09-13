import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Avatar,
  AvatarGroup,
  Skeleton,
  SkeletonText,
  Alert,
  AlertIcon,
  Input,
  Select,
  IconButton,
  Tooltip,
  useColorModeValue,
  useToast,
  Card,
  CardBody,
  Flex,
  Spacer,
  Tag,
  TagLabel,
  Divider
} from '@chakra-ui/react';
import {
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  UsersIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { getTickets, TicketFilters, Ticket } from '../../lib/api/tickets';
import { TicketFormModal } from './TicketFormModal';

interface EnhancedTicketListProps {
  siteId?: number;
  showCreateButton?: boolean;
}

export const EnhancedTicketList: React.FC<EnhancedTicketListProps> = ({
  siteId,
  showCreateButton = true
}) => {
  const router = useRouter();
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  // State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState<TicketFilters>({
    siteId: siteId
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Load tickets
  const loadTickets = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getTickets(filters);
      setTickets(data);
    } catch (err: any) {
      console.error('Failed to load tickets:', err);
      setError(err.message || 'Failed to load tickets');
      toast({
        title: 'Error',
        description: 'Failed to load tickets',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Filter tickets by search term
  const filteredTickets = tickets.filter(ticket =>
    ticket.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.ticket_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFilterChange = (key: keyof TicketFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
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

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 1: return 'gray';
      case 2: return 'blue';
      case 3: return 'yellow';
      case 4: return 'orange';
      case 5: return 'red';
      default: return 'gray';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'blue';
      case 'in progress': return 'orange';
      case 'pending': return 'yellow';
      case 'resolved': return 'green';
      case 'closed': return 'gray';
      case 'canceled': return 'red';
      default: return 'gray';
    }
  };

  const TicketCard: React.FC<{ ticket: Ticket }> = ({ ticket }) => (
    <Card
      bg={bgColor}
      borderColor={borderColor}
      _hover={{ bg: hoverBg, transform: 'translateY(-1px)' }}
      transition="all 0.2s"
      cursor="pointer"
      onClick={() => {
        // Navigate to ticket detail using Next.js router
        router.push(`/tickets/${ticket.ticket_id}`);
      }}
    >
      <CardBody>
        <VStack align="stretch" spacing={3}>
          {/* Header with ticket number and privacy */}
          <Flex align="center">
            <HStack spacing={2}>
              <Text fontSize="sm" fontWeight="bold" color="gray.600">
                {ticket.ticket_no || `#${ticket.ticket_id}`}
              </Text>
              <Tooltip label={`Privacy: ${ticket.privacy_level}`}>
                <Box color={`${getPrivacyColor(ticket.privacy_level ?? 'private')}.500`}>
                  {getPrivacyIcon(ticket.privacy_level ?? 'private')}
                </Box>
              </Tooltip>
            </HStack>
            <Spacer />
            <HStack spacing={2}>
              <Badge colorScheme={getSeverityColor(ticket.severity)}>
                Severity {ticket.severity}
              </Badge>
              <Badge colorScheme={getStatusColor(ticket.status)}>
                {ticket.status}
              </Badge>
            </HStack>
          </Flex>

          {/* Summary */}
          <Text fontSize="md" fontWeight="semibold" noOfLines={2}>
            {ticket.summary}
          </Text>

          {/* Substatus and description */}
          {ticket.substatus_name && (
            <Text fontSize="sm" color="gray.600">
              {ticket.substatus_name}
            </Text>
          )}

          {ticket.description && (
            <Text fontSize="sm" color="gray.500" noOfLines={2}>
              {ticket.description}
            </Text>
          )}

          {/* Contact and site info */}
          <HStack spacing={4} fontSize="sm">
            {ticket.site_name && (
              <HStack spacing={1}>
                <Text color="gray.500">Site:</Text>
                <Text fontWeight="medium">{ticket.site_name}</Text>
              </HStack>
            )}
            {ticket.contact_name && (
              <HStack spacing={1}>
                <Text color="gray.500">Contact:</Text>
                <Text fontWeight="medium">{ticket.contact_name}</Text>
              </HStack>
            )}
          </HStack>

          <Divider />

          {/* Footer with watchers, assignee, and timestamps */}
          <Flex align="center" fontSize="sm">
            <HStack spacing={3}>
              {/* Watchers */}
              {(ticket.watcher_count || 0) > 0 && (
                <Tooltip label={`${ticket.watcher_count} watchers, ${ticket.collaborator_count || 0} collaborators`}>
                  <HStack spacing={1}>
                    <UsersIcon className="w-4 h-4" />
                    <Text>{ticket.watcher_count}</Text>
                    {(ticket.collaborator_count || 0) > 0 && (
                      <Badge size="sm" colorScheme="blue" variant="subtle">
                        {ticket.collaborator_count}
                      </Badge>
                    )}
                  </HStack>
                </Tooltip>
              )}

              {/* Assignee */}
              {ticket.assignee_name && (
                <HStack spacing={1}>
                  <Text color="gray.500">Assigned:</Text>
                  <Text fontWeight="medium">{ticket.assignee_name}</Text>
                </HStack>
              )}

              {/* Created by */}
              {ticket.created_by_name && (
                <HStack spacing={1}>
                  <Text color="gray.500">Created by:</Text>
                  <Text fontWeight="medium">{ticket.created_by_name}</Text>
                </HStack>
              )}
            </HStack>

            <Spacer />

            {/* Timestamps */}
            <VStack align="end" spacing={0}>
              <Text color="gray.500">
                Created {formatDistanceToNow(parseISO(ticket.created_at))} ago
              </Text>
              {ticket.updated_at !== ticket.created_at && (
                <Text color="gray.400" fontSize="xs">
                  Updated {formatDistanceToNow(parseISO(ticket.updated_at))} ago
                </Text>
              )}
            </VStack>
          </Flex>
        </VStack>
      </CardBody>
    </Card>
  );

  if (loading) {
    return (
      <VStack spacing={4} align="stretch">
        {[...Array(5)].map((_, i) => (
          <Card key={i} bg={bgColor}>
            <CardBody>
              <VStack spacing={3} align="stretch">
                <Skeleton height="20px" />
                <SkeletonText noOfLines={2} />
                <Skeleton height="16px" />
              </VStack>
            </CardBody>
          </Card>
        ))}
      </VStack>
    );
  }

  return (
    <Box>
      {/* Header with search and filters */}
      <VStack spacing={4} mb={6}>
        <Flex w="full" align="center">
          <Text fontSize="2xl" fontWeight="bold">
            Tickets
          </Text>
          <Spacer />
          {showCreateButton && (
            <Button
              leftIcon={<PlusIcon className="w-4 h-4" />}
              colorScheme="blue"
              onClick={() => setShowCreateModal(true)}
            >
              Create Ticket
            </Button>
          )}
        </Flex>

        {/* Search and filters */}
        <HStack spacing={3} w="full">
          <Box position="relative" maxW="300px">
            <Input
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              pl={8}
            />
            <Box position="absolute" left={2} top="50%" transform="translateY(-50%)" color="gray.400">
              <MagnifyingGlassIcon className="w-4 h-4" />
            </Box>
          </Box>
          
          <Select
            placeholder="All Statuses"
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            maxW="150px"
          >
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending">Pending</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </Select>

          <Select
            placeholder="All Privacy Levels"
            value={filters.privacy_level || ''}
            onChange={(e) => handleFilterChange('privacy_level', e.target.value)}
            maxW="150px"
          >
            <option value="public">Public</option>
            <option value="site_only">Site Only</option>
            <option value="private">Private</option>
          </Select>

          <Tooltip label="Clear filters">
            <IconButton
              aria-label="Clear filters"
              icon={<FunnelIcon className="w-4 h-4" />}
              variant="ghost"
              onClick={() => {
                setFilters({ siteId });
                setSearchTerm('');
              }}
            />
          </Tooltip>
        </HStack>
      </VStack>

      {/* Error display */}
      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      {/* Tickets list */}
      {filteredTickets.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Text fontSize="lg" color="gray.500">
            {searchTerm || Object.keys(filters).length > 1 
              ? 'No tickets match your search criteria' 
              : 'No tickets found'
            }
          </Text>
          {showCreateButton && (
            <Button
              mt={4}
              leftIcon={<PlusIcon className="w-4 h-4" />}
              colorScheme="blue"
              variant="outline"
              onClick={() => setShowCreateModal(true)}
            >
              Create First Ticket
            </Button>
          )}
        </Box>
      ) : (
        <VStack spacing={3} align="stretch">
          {filteredTickets.map(ticket => (
            <TicketCard key={ticket.ticket_id} ticket={ticket} />
          ))}
        </VStack>
      )}

      {/* Create ticket modal */}
      <TicketFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(ticketId) => {
          loadTickets(); // Refresh the list
          // Optionally navigate to the new ticket
        }}
        siteId={siteId}
      />
    </Box>
  );
};
