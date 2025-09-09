import { FC } from 'react';
import { Box, Heading, Stat, StatLabel, StatNumber, StatHelpText, SimpleGrid } from '@chakra-ui/react';

export const OpenTicketsWidget: FC = () => {
  // Placeholder values; should be wired to getTickets filter=status=open
  const openCount = 42;
  const avgPriority = 2.6;

  return (
    <Box bg="bg.surface" p={4} borderRadius="md" boxShadow="sm">
      <Heading as="h3" size="sm" mb={3}>Open Tickets</Heading>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Stat>
          <StatLabel>Open</StatLabel>
          <StatNumber>{openCount}</StatNumber>
          <StatHelpText>Updated 10m ago</StatHelpText>
        </Stat>
        <Stat>
          <StatLabel>Avg Priority</StatLabel>
          <StatNumber>{avgPriority}</StatNumber>
          <StatHelpText>Higher is more urgent</StatHelpText>
        </Stat>
      </SimpleGrid>
    </Box>
  );
};

export default OpenTicketsWidget;
