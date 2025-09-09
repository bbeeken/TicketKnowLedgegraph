import { FC, useEffect, useState } from 'react';
import { Box, VStack, HStack, Text, Badge, IconButton, Spinner } from '@chakra-ui/react';
import { Ticket } from '@/lib/api/tickets';
import { getTickets } from '@/lib/api/tickets';
import { ChevronRightIcon, PhoneIcon } from '@heroicons/react/24/outline';

export const MobileTicketList: FC = () => {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getTickets().then((t) => {
      setTickets(t);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!tickets || tickets.length === 0) return <Text color="gray.500">No tickets found</Text>;

  return (
    <VStack spacing={3} align="stretch">
      {tickets.map((ticket) => (
        <Box key={ticket.id} p={4} bg="bg.surface" borderRadius="md" boxShadow="sm">
          <HStack justify="space-between" align="start">
            <Box>
              <Text fontWeight="semibold">{ticket.summary}</Text>
              <Text fontSize="sm" color="text.secondary">{ticket.description?.slice(0, 120)}</Text>
              <HStack mt={2} spacing={3}>
                <Badge colorScheme={ticket.priority > 3 ? 'red' : 'green'}>{ticket.status}</Badge>
                <Text fontSize="xs" color="text.muted">{new Date(ticket.createdAt).toLocaleString()}</Text>
              </HStack>
            </Box>
            <HStack>
              <IconButton aria-label="Call assignee" icon={<PhoneIcon width={18} />} />
              <IconButton aria-label="Open" icon={<ChevronRightIcon width={18} />} />
            </HStack>
          </HStack>
        </Box>
      ))}
    </VStack>
  );
};

export default MobileTicketList;
