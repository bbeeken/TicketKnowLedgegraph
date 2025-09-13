import { FC } from 'react';
import { Box, VStack, Text, useColorModeValue } from '@chakra-ui/react';
import { RealTimeDashboard } from './RealTimeDashboard';

export const BeautifulDashboard: FC = () => {
  const bg = useColorModeValue('gray.50', 'gray.900');

  return (
    <Box
      w="full"
      p={6}
      bg={bg}
      minH="calc(100vh - 80px)"
    >
      <VStack spacing={6} align="stretch">
        <Box>
          <Text fontSize="3xl" fontWeight="bold" mb={2}>
            Operations Dashboard
          </Text>
          <Text color="gray.600" fontSize="lg">
            Real-time monitoring and system insights
          </Text>
        </Box>
        
        <RealTimeDashboard />
      </VStack>
    </Box>
  );
};

export default BeautifulDashboard;
