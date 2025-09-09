import { FC } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
  Icon,
  Progress,
} from '@chakra-ui/react';
import { 
  TicketIcon, 
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

interface DashboardMetric {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: any;
  color: string;
  bgGradient: string;
}

const metrics: DashboardMetric[] = [
  {
    label: 'Open Tickets',
    value: 23,
    change: -12,
    changeLabel: 'vs last week',
    icon: TicketIcon,
    color: 'blue',
    bgGradient: 'linear(to-br, blue.400, blue.600)',
  },
  {
    label: 'Critical Alerts',
    value: 4,
    change: 8,
    changeLabel: 'vs yesterday',
    icon: ExclamationTriangleIcon,
    color: 'red',
    bgGradient: 'linear(to-br, red.400, red.600)',
  },
  {
    label: 'Avg Resolution',
    value: '2.4h',
    change: -15,
    changeLabel: 'improvement',
    icon: ClockIcon,
    color: 'green',
    bgGradient: 'linear(to-br, green.400, green.600)',
  },
  {
    label: 'System Health',
    value: '94%',
    change: 2,
    changeLabel: 'uptime',
    icon: ArrowTrendingUpIcon,
    color: 'purple',
    bgGradient: 'linear(to-br, purple.400, purple.600)',
  },
];

export const BeautifulDashboard: FC = () => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');

  return (
    <VStack spacing={8} align="stretch">
      {/* Hero Stats Grid */}
      <Box>
        <Text 
          fontSize="3xl" 
          fontWeight="800" 
          bgGradient="linear(to-r, brand.400, purple.500)"
          bgClip="text"
          mb={8}
        >
          Operations Dashboard
        </Text>
        
        <Box
          display="grid"
          gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }}
          gap={6}
        >
          {metrics.map((metric, index) => (
            <MotionBox
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4 }}
            >
              <Box
                bg={cardBg}
                borderRadius="2xl"
                p={6}
                shadow="xl"
                borderWidth="1px"
                borderColor={borderColor}
                position="relative"
                overflow="hidden"
                _hover={{
                  shadow: '2xl',
                  transform: 'translateY(-2px)',
                }}
                transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
              >
                {/* Background gradient accent */}
                <Box
                  position="absolute"
                  top={0}
                  right={0}
                  w="100px"
                  h="100px"
                  bgGradient={metric.bgGradient}
                  opacity={0.1}
                  borderRadius="full"
                  transform="translate(30px, -30px)"
                />
                
                <HStack justify="space-between" mb={4}>
                  <Box
                    p={3}
                    borderRadius="xl"
                    bg={`${metric.color}.100`}
                    color={`${metric.color}.600`}
                    _dark={{
                      bg: `${metric.color}.900`,
                      color: `${metric.color}.300`,
                    }}
                  >
                    <Icon as={metric.icon} boxSize={6} />
                  </Box>
                </HStack>

                <VStack align="start" spacing={2}>
                  <Text
                    fontSize="sm"
                    fontWeight="600"
                    color="gray.500"
                    _dark={{ color: 'gray.400' }}
                    textTransform="uppercase"
                    letterSpacing="wide"
                  >
                    {metric.label}
                  </Text>
                  
                  <Text
                    fontSize="3xl"
                    fontWeight="800"
                    color="gray.900"
                    _dark={{ color: 'gray.100' }}
                    lineHeight={1}
                  >
                    {metric.value}
                  </Text>

                  {metric.change && (
                    <HStack spacing={1}>
                      <Icon 
                        as={metric.change > 0 ? ChevronUpIcon : ChevronDownIcon}
                        boxSize={3}
                        color={metric.change > 0 ? 'green.500' : 'red.500'}
                      />
                      <Text
                        fontSize="sm"
                        fontWeight="600"
                        color={metric.change > 0 ? 'green.500' : 'red.500'}
                      >
                        {Math.abs(metric.change)}%
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        {metric.changeLabel}
                      </Text>
                    </HStack>
                  )}
                </VStack>
              </Box>
            </MotionBox>
          ))}
        </Box>
      </Box>

      {/* Secondary Stats */}
      <Box
        display="grid"
        gridTemplateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }}
        gap={6}
      >
        <MotionBox
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Box
            bg={cardBg}
            borderRadius="2xl"
            p={6}
            shadow="xl"
            borderWidth="1px"
            borderColor={borderColor}
          >
            <Text fontSize="lg" fontWeight="700" mb={4}>
              Team Performance
            </Text>
            <VStack spacing={4}>
              <Box w="full">
                <Flex justify="space-between" mb={2}>
                  <Text fontSize="sm" fontWeight="600">Resolution Rate</Text>
                  <Text fontSize="sm" color="gray.500">87%</Text>
                </Flex>
                <Progress 
                  value={87} 
                  colorScheme="green" 
                  borderRadius="full" 
                  size="lg"
                  bg="gray.100"
                  _dark={{ bg: 'gray.700' }}
                />
              </Box>
              <Box w="full">
                <Flex justify="space-between" mb={2}>
                  <Text fontSize="sm" fontWeight="600">Response Time</Text>
                  <Text fontSize="sm" color="gray.500">94%</Text>
                </Flex>
                <Progress 
                  value={94} 
                  colorScheme="blue" 
                  borderRadius="full" 
                  size="lg"
                  bg="gray.100"
                  _dark={{ bg: 'gray.700' }}
                />
              </Box>
            </VStack>
          </Box>
        </MotionBox>

        <MotionBox
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Box
            bg={cardBg}
            borderRadius="2xl"
            p={6}
            shadow="xl"
            borderWidth="1px"
            borderColor={borderColor}
          >
            <Text fontSize="lg" fontWeight="700" mb={4}>
              Recent Activity
            </Text>
            <VStack spacing={3} align="stretch">
              {[
                { action: 'Ticket #1247 resolved', time: '2 min ago', type: 'success' },
                { action: 'New critical alert', time: '5 min ago', type: 'warning' },
                { action: 'System maintenance completed', time: '1 hour ago', type: 'info' },
              ].map((item, i) => (
                <HStack key={i} spacing={3}>
                  <Box
                    w={3}
                    h={3}
                    borderRadius="full"
                    bg={
                      item.type === 'success' ? 'green.400' :
                      item.type === 'warning' ? 'yellow.400' : 'blue.400'
                    }
                  />
                  <VStack align="start" spacing={0} flex={1}>
                    <Text fontSize="sm" fontWeight="500">
                      {item.action}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {item.time}
                    </Text>
                  </VStack>
                </HStack>
              ))}
            </VStack>
          </Box>
        </MotionBox>
      </Box>
    </VStack>
  );
};

export default BeautifulDashboard;
