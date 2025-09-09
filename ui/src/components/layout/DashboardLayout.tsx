import { FC, ReactNode } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout: FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <Flex h="100vh" overflow="hidden">
      <Sidebar />
      
      <Flex direction="column" flex={1} ml={{ base: '80px', md: '280px' }}>
        <Header />
        
        <Box 
          as="main" 
          flex={1} 
          overflow="auto" 
          p={6}
          bg="gray.50"
          _dark={{ bg: 'gray.900' }}
        >
          {children}
        </Box>
      </Flex>
    </Flex>
  );
};
