import { FC } from 'react';
import {
  Box,
  Flex,
  VStack,
  IconButton,
  Tooltip,
  Text,
  Divider,
} from '@chakra-ui/react';
import {
  HomeIcon,
  TicketIcon,
  BellAlertIcon,
  ChartBarIcon,
  CubeIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useAtom } from 'jotai';
import { sidebarCollapsedAtom } from '@/atoms';
import NextLink from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';

const navItems = [
  { icon: HomeIcon, label: 'Dashboard', href: '/dashboard' },
  { icon: TicketIcon, label: 'Tickets', href: '/tickets' },
  { icon: BellAlertIcon, label: 'Alerts', href: '/alerts' },
  { icon: CubeIcon, label: 'Assets', href: '/assets' },
  { icon: ChartBarIcon, label: 'Analytics', href: '/analytics' },
];

export const Sidebar: FC = () => {
  const [isCollapsed, setIsCollapsed] = useAtom(sidebarCollapsedAtom);
  // const { user } = useAuth();
  const isAdmin = true; // Always show admin features for now

  return (
    <Flex
      as="nav"
      direction="column"
      w={isCollapsed ? '80px' : '280px'}
      h="100vh"
      bgGradient="linear(135deg, purple.900, blue.800)"
      borderRightWidth="1px"
      borderColor="whiteAlpha.200"
      position="fixed"
      top={0}
      left={0}
      zIndex={1000}
      transition="width 0.2s ease-in-out"
      boxShadow="xl"
    >
      <Flex
        align="center"
        justify={isCollapsed ? 'center' : 'space-between'}
        p={4}
        h="60px"
      >
        {!isCollapsed && (
          <Text fontSize="xl" fontWeight="bold" color="white" letterSpacing="wider">
            OpsGraph
          </Text>
        )}
        <IconButton
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          icon={
            isCollapsed ? (
              <ChevronDoubleRightIcon width={20} />
            ) : (
              <ChevronDoubleLeftIcon width={20} />
            )
          }
          onClick={() => setIsCollapsed(!isCollapsed)}
          variant="ghost"
          color="whiteAlpha.800"
          _hover={{ bg: 'whiteAlpha.200', color: 'white' }}
        />
      </Flex>
      <Divider borderColor="whiteAlpha.200" />
      <VStack as="ul" spacing={2} p={2} flex={1} align="stretch">
        {navItems.map(({ icon: Icon, label, href }) => (
          <NavItem
            key={label}
            icon={<Icon width={24} />}
            label={label}
            href={href}
            isCollapsed={isCollapsed}
          />
        ))}
        {isAdmin && (
          <NavItem
            icon={<UserGroupIcon width={24} />}
            label="Admin"
            href="/admin"
            isCollapsed={isCollapsed}
          />
        )}
      </VStack>
      <Divider borderColor="whiteAlpha.200" />
      <VStack as="ul" spacing={2} p={2} align="stretch">
        <NavItem
          icon={<Cog6ToothIcon width={24} />}
          label="Settings"
          href="/settings"
          isCollapsed={isCollapsed}
        />
        <NavItem
          icon={<ArrowLeftOnRectangleIcon width={24} />}
          label="Logout"
          href="/logout"
          isCollapsed={isCollapsed}
        />
      </VStack>
    </Flex>
  );
};

interface NavItemProps {
  icon: React.ReactElement;
  label: string;
  href: string;
  isCollapsed: boolean;
}

const NavItem: FC<NavItemProps> = ({ icon, label, href, isCollapsed }) => {
  return (
    <Tooltip label={isCollapsed ? label : ''} placement="right">
      <Box as="li" listStyleType="none">
        <NextLink href={href} style={{ textDecoration: 'none' }}>
          <Flex
            align="center"
            p={3}
            borderRadius="lg"
            color="whiteAlpha.800"
            cursor="pointer"
            _hover={{ 
              bg: 'whiteAlpha.200', 
              color: 'white',
              transform: 'translateX(4px)',
              transition: 'all 0.2s ease'
            }}
            justify={isCollapsed ? 'center' : 'flex-start'}
            transition="all 0.2s ease"
          >
            {icon}
            {!isCollapsed && <Text ml={4} fontWeight="medium">{label}</Text>}
          </Flex>
        </NextLink>
      </Box>
    </Tooltip>
  );
};

export const SidebarContent = () => {
  // const { user } = useAuth();
  const isAdmin = true; // Always show admin features for now

  return (
    <VStack as="ul" spacing={2} p={2} flex={1} align="stretch">
      {navItems.map(({ icon: Icon, label, href }) => (
        <NavItem
          key={label}
          icon={<Icon width={24} />}
          label={label}
          href={href}
          isCollapsed={false}
        />
      ))}
      {isAdmin && (
        <NavItem
          icon={<UserGroupIcon width={24} />}
          label="Admin"
          href="/admin"
          isCollapsed={false}
        />
      )}
    </VStack>
  );
};
