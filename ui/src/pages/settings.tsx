import { FC, useState } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Button,
  FormControl,
  FormLabel,
  Input,
  Alert,
  AlertIcon,
  useColorModeValue,
  Divider,
  Badge,
} from '@chakra-ui/react';
import { useAuth } from '@/components/auth/AuthProvider';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const SettingsPage: FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const handleProfileUpdate = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // TODO: Implement profile update API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setError('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // TODO: Implement password change API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
      setSuccess('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setError('Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Container maxW="4xl" py={8}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <Box>
            <Heading size="lg" color="brand.500">Settings</Heading>
            <Text color="gray.500" mt={1}>
              Manage your account settings and preferences
            </Text>
          </Box>

          {/* Alerts */}
          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              {success}
            </Alert>
          )}

          {/* Profile Information */}
          <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
            <CardHeader>
              <HStack justify="space-between">
                <Box>
                  <Text fontSize="lg" fontWeight="semibold">Profile Information</Text>
                  <Text fontSize="sm" color="gray.500">
                    Update your personal information
                  </Text>
                </Box>
                <VStack spacing={1} align="end">
                  <Badge colorScheme="blue">{user?.auth_provider}</Badge>
                  <Badge colorScheme={user?.profile?.role === 'admin' ? 'purple' : 'green'}>
                    {user?.profile?.role?.toUpperCase()}
                  </Badge>
                </VStack>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel>Full Name</FormLabel>
                  <Input
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Email Address</FormLabel>
                  <Input
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    placeholder="Enter your email"
                    isDisabled={user?.auth_provider === 'microsoft'}
                  />
                  {user?.auth_provider === 'microsoft' && (
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      Email cannot be changed for Microsoft accounts
                    </Text>
                  )}
                </FormControl>

                <Button
                  colorScheme="brand"
                  onClick={handleProfileUpdate}
                  isLoading={isLoading}
                  loadingText="Updating..."
                  alignSelf="start"
                >
                  Update Profile
                </Button>
              </VStack>
            </CardBody>
          </Card>

          {/* Password Change (Local accounts only) */}
          {user?.auth_provider === 'local' && (
            <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
              <CardHeader>
                <Text fontSize="lg" fontWeight="semibold">Change Password</Text>
                <Text fontSize="sm" color="gray.500">
                  Update your account password
                </Text>
              </CardHeader>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel>Current Password</FormLabel>
                    <Input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>New Password</FormLabel>
                    <Input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="Enter new password"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Confirm New Password</FormLabel>
                    <Input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                    />
                  </FormControl>

                  <Button
                    colorScheme="brand"
                    onClick={handlePasswordChange}
                    isLoading={isLoading}
                    loadingText="Changing..."
                    alignSelf="start"
                  >
                    Change Password
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          )}

          {/* Account Information */}
          <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
            <CardHeader>
              <Text fontSize="lg" fontWeight="semibold">Account Information</Text>
            </CardHeader>
            <CardBody>
              <VStack spacing={3} align="stretch">
                <HStack justify="space-between">
                  <Text color="gray.600">User ID</Text>
                  <Text fontFamily="mono" fontSize="sm">{user?.id}</Text>
                </HStack>
                <Divider />
                <HStack justify="space-between">
                  <Text color="gray.600">Authentication Provider</Text>
                  <Badge colorScheme="blue">{user?.auth_provider}</Badge>
                </HStack>
                <Divider />
                <HStack justify="space-between">
                  <Text color="gray.600">Role</Text>
                  <Badge colorScheme={user?.profile?.role === 'admin' ? 'purple' : 'green'}>
                    {user?.profile?.role?.toUpperCase()}
                  </Badge>
                </HStack>
                <Divider />
                <HStack justify="space-between">
                  <Text color="gray.600">Site Access</Text>
                  <Text fontSize="sm">{user?.profile?.site_ids?.length || 0} sites</Text>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </DashboardLayout>
  );
};

export default SettingsPage;
