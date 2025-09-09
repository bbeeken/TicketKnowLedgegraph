import { FC } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  IconButton,
  Avatar,
  Badge,
  useColorModeValue,
  Skeleton,
  ScaleFade,
} from '@chakra-ui/react';
import { 
  ChevronRightIcon, 
  PhoneIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

interface Ticket {
  id: number;
  summary: string;
  description: string;
  status: string;
  priority: number;
  createdAt: string;
  assignedTo?: { name: string; avatar?: string };
}

// Mock data for beautiful demo
const mockTickets: Ticket[] = [
  {
    id: 1,
    summary: "POS System Down - Store #42",
    description: "Primary point of sale system is completely unresponsive. Customers cannot process payments.",
    status: "Critical",
    priority: 5,
    createdAt: "2025-09-08T10:30:00Z",
    assignedTo: { name: "Sarah Chen", avatar: "SC" }
  },
  {
    id: 2,
    summary: "Fuel Dispenser Error - Pump 3",
    description: "Fuel dispenser showing error code E-404. Unable to authorize transactions.",
    status: "High",
    priority: 4,
    createdAt: "2025-09-08T11:15:00Z",
    assignedTo: { name: "Mike Rodriguez", avatar: "MR" }
  },
  {
    id: 3,
    summary: "WiFi Connectivity Issues",
    description: "Intermittent connectivity issues affecting customer WiFi and internal systems.",
    status: "Medium",
    priority: 3,
    createdAt: "2025-09-08T12:00:00Z",
  }
];

const getPriorityColor = (priority: number) => {
  if (priority >= 5) return 'red';
  if (priority >= 4) return 'orange';
  if (priority >= 3) return 'yellow';
  return 'green';
};

const getPriorityIcon = (priority: number) => {
  if (priority >= 5) return ExclamationTriangleIcon;
  if (priority >= 4) return ClockIcon;
  return CheckCircleIcon;
};

export const BeautifulTicketList: FC = () => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');

  return (
    <VStack spacing={6} align="stretch">
      {mockTickets.map((ticket, index) => {
        const PriorityIcon = getPriorityIcon(ticket.priority);
        const priorityColor = getPriorityColor(ticket.priority);
        
        return (
          <ScaleFade key={ticket.id} in={true} delay={index * 0.1}>
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <Box
                bg={cardBg}
                borderRadius="2xl"
                p={6}
                shadow="xl"
                borderWidth="1px"
                borderColor={borderColor}
                cursor="pointer"
                transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                _hover={{
                  shadow: '2xl',
                  borderColor: 'brand.200',
                }}
              >
                <Flex justify="space-between" align="start" mb={4}>
                  <HStack spacing={3} flex={1}>
                    <Box
                      p={2}
                      borderRadius="xl"
                      bg={`${priorityColor}.100`}
                      color={`${priorityColor}.600`}
                    >
                      <PriorityIcon width={20} />
                    </Box>
                    <VStack align="start" spacing={1} flex={1}>
                      <Text
                        fontSize="lg"
                        fontWeight="700"
                        color="gray.900"
                        _dark={{ color: 'gray.100' }}
                        lineHeight={1.2}
                      >
                        {ticket.summary}
                      </Text>
                      <Text
                        fontSize="sm"
                        color="gray.600"
                        _dark={{ color: 'gray.300' }}
                        noOfLines={2}
                        lineHeight={1.4}
                      >
                        {ticket.description}
                      </Text>
                    </VStack>
                  </HStack>
                  
                  <IconButton
                    aria-label="View details"
                    icon={<ChevronRightIcon width={20} />}
                    variant="ghost"
                    size="sm"
                    color="gray.400"
                    _hover={{ color: 'brand.500', bg: 'brand.50' }}
                  />
                </Flex>

                <Flex justify="space-between" align="center">
                  <HStack spacing={4}>
                    <Badge
                      colorScheme={priorityColor}
                      variant="subtle"
                      px={3}
                      py={1}
                      borderRadius="full"
                      fontSize="xs"
                      fontWeight="600"
                      textTransform="none"
                    >
                      {ticket.status}
                    </Badge>
                    
                    <HStack spacing={2}>
                      <ClockIcon width={14} color="gray.400" />
                      <Text fontSize="xs" color="gray.500">
                        {new Date(ticket.createdAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Text>
                    </HStack>
                  </HStack>

                  <HStack spacing={3}>
                    {ticket.assignedTo && (
                      <HStack spacing={2}>
                        <Avatar
                          size="sm"
                          name={ticket.assignedTo.name}
                          bg="brand.500"
                          color="white"
                        />
                        <Text fontSize="sm" fontWeight="500" color="gray.700" _dark={{ color: 'gray.200' }}>
                          {ticket.assignedTo.name}
                        </Text>
                      </HStack>
                    )}
                    
                    <IconButton
                      aria-label="Call assignee"
                      icon={<PhoneIcon width={16} />}
                      size="sm"
                      variant="outline"
                      colorScheme="brand"
                      borderRadius="full"
                    />
                  </HStack>
                </Flex>
              </Box>
            </MotionBox>
          </ScaleFade>
        );
      })}
    </VStack>
  );
};

export default BeautifulTicketList;
