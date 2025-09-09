import { FC, ReactNode } from 'react';
import { Box, Flex, useBreakpointValue } from '@chakra-ui/react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAtom } from 'jotai';
import { sidebarCollapsedAtom } from '@/atoms';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout: FC<AppLayoutProps> = ({ children }) => {
  const [isCollapsed] = useAtom(sidebarCollapsedAtom);
  const isMobile = useBreakpointValue({ base: true, lg: false });

  const sidebarWidth = isCollapsed ? 80 : 280;

  return (
    <Flex h="100vh" bgGradient="linear(135deg, gray.50, blue.50)">
      <Sidebar />
      {/* Reserve inline space with an invisible spacer to prevent overlap */}
      <Box as="aside" aria-hidden="true" w={{ base: 0, lg: sidebarWidth }} flexShrink={0} />
      <Flex direction="column" flex="1" overflow="hidden">
        <Header />
        <Box
          as="main"
          id="main-content"
          flex="1"
          p={{ base: 4, md: 6, lg: 8 }}
          transition="padding-left 0.2s ease-in-out"
          overflowY="auto"
        >
          {children}
        </Box>
      </Flex>
    </Flex>
  );
};
