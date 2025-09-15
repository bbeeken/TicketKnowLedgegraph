import { FC } from 'react';
import {
  Box,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Text,
  Flex,
  Badge,
} from '@chakra-ui/react';
import { useAuth } from '@/components/auth/AuthProvider';

export const UserProfile: FC = () => {
  // const { user, signOut } = useAuth();
  
  // Mock user for development
  const user = { 
    email: 'admin@example.com',
    profile: { 
      full_name: 'Admin User',
      is_admin: true,
      role: 'admin',
      avatar_url: undefined,
      auth_provider: 'local'
    }
  };
  const signOut = () => console.log('Sign out clicked');

  // if (!user) return null;

  const profile = user.profile;
  const displayName = profile?.full_name || user.email.split('@')[0];
  const isAdmin = profile?.is_admin || profile?.role === 'admin';

  return (
    <Menu>
      <MenuButton as={Box} cursor="pointer">
        <Flex align="center" gap={2}>
          <Avatar 
            size="sm" 
            name={displayName}
            src={profile?.avatar_url}
          />
          <Box display={{ base: 'none', md: 'block' }}>
            <Flex align="center" gap={2}>
              <Text fontSize="sm" fontWeight="medium">{displayName}</Text>
              {isAdmin && (
                <Badge colorScheme="purple" size="sm">Admin</Badge>
              )}
            </Flex>
            <Flex align="center" gap={2}>
              <Text fontSize="xs" color="gray.500" textTransform="capitalize">
                {profile?.role || 'User'}
              </Text>
              <Text fontSize="xs" color="gray.400">
                ({profile?.auth_provider || 'local'})
              </Text>
            </Flex>
          </Box>
        </Flex>
      </MenuButton>
      <MenuList>
        <MenuItem>Profile</MenuItem>
        <MenuItem>Settings</MenuItem>
        {profile?.auth_provider === 'local' && (
          <MenuItem>Change Password</MenuItem>
        )}
        <MenuDivider />
        <MenuItem onClick={() => signOut()}>Sign out</MenuItem>
      </MenuList>
    </Menu>
  );
};
