import { FC } from 'react';
import {
  Box,
  Flex,
  IconButton,
  useBreakpointValue,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { UserProfile } from './UserProfile';
import { SearchBar } from './SearchBar';
import { Notifications } from './Notifications';
import { ThemeSwitcher } from './ThemeSwitcher';
import { SidebarContent } from './Sidebar';

export const Header: FC = () => {
  const isMobile = useBreakpointValue({ base: true, lg: false });
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Flex
      as="header"
      align="center"
      justify="space-between"
      w="full"
      px={{ base: 4, md: 6 }}
      py={3}
      bg="white"
      borderBottomWidth="1px"
      borderColor="gray.200"
      boxShadow="sm"
    >
      <Flex align="center" gap={4}>
        {isMobile && (
          <IconButton
            aria-label="Open menu"
            icon={<Bars3Icon width={24} />}
            onClick={onOpen}
            variant="ghost"
          />
        )}
        <SearchBar />
      </Flex>

      <Flex align="center" gap={4}>
        <ThemeSwitcher />
        <Notifications />
        <UserProfile />
      </Flex>

      {isMobile && (
        <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
          <DrawerOverlay />
          <DrawerContent>
            <DrawerCloseButton />
            <DrawerHeader>OpsGraph</DrawerHeader>
            <DrawerBody>
              <SidebarContent />
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      )}
    </Flex>
  );
};
