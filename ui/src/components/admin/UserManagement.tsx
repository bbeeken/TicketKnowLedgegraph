import { FC, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Container,
  FormControl,
  FormLabel,
  Input,
  VStack,
  HStack,
  Text,
  Alert,
  AlertIcon,
  Heading,
  useColorModeValue,
  Select,
  CheckboxGroup,
  Checkbox,
  Stack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import {
  PlusIcon,
  EllipsisVerticalIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import { opsGraphAuth } from '@/lib/auth';
import { withAdminAuth } from '@/components/auth/AuthProvider';

// Mock site data - this would come from your API
const mockSites = [
  { id: 1, name: 'Hot Springs SD', label: 'Hot Springs Travel Plaza' },
  { id: 2, name: 'Pierre SD', label: 'Pierre Fuel & More' },
  { id: 3, name: 'Rapid City SD', label: 'Rapid City Express' },
  { id: 4, name: 'Sioux Falls SD', label: 'Sioux Falls SuperStop' },
  { id: 5, name: 'Watertown SD', label: 'Watertown Travel Center' },
  { id: 6, name: 'Aberdeen SD', label: 'Aberdeen Quick Stop' },
  { id: 7, name: 'Brookings SD', label: 'Brookings Fuel Plaza' },
];

// Mock user data - this would come from your API
const mockUsers = [
  {
    id: '1',
    email: 'manager@hotsprings.com',
    full_name: 'Sarah Johnson',
    role: 'manager',
    auth_provider: 'local',
    site_ids: [1],
    created_at: '2024-01-15',
    is_active: true,
  },
  {
    id: '2',
    email: 'tech@pierre.com',
    full_name: 'Mike Wilson',
    role: 'technician',
    auth_provider: 'local',
    site_ids: [2],
    created_at: '2024-02-20',
    is_active: true,
  },
  {
    id: '3',
    email: 'admin@corporate.com',
    full_name: 'Jennifer Adams',
    role: 'admin',
    auth_provider: 'microsoft',
    site_ids: [1, 2, 3, 4, 5, 6, 7],
    created_at: '2024-01-01',
    is_active: true,
  },
];

interface CreateUserFormData {
  email: string;
  password: string;
  confirmPassword: string;
  full_name: string;
  role: 'manager' | 'technician' | 'viewer';
  site_ids: number[];
}

const AdminUserManagement: FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [users, setUsers] = useState(mockUsers);
  
  const [formData, setFormData] = useState<CreateUserFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    role: 'technician',
    site_ids: [],
  });

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const handleCreateUser = async () => {
    if (!formData.email || !formData.password || !formData.full_name) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.site_ids.length === 0) {
      setError('Please select at least one site');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { user, error } = await opsGraphAuth.createLocalAccount({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        role: formData.role,
        site_ids: formData.site_ids,
      });

      if (error) {
        setError(error.message);
      } else if (user) {
        setSuccess(`User ${formData.email} created successfully`);
        // Reset form
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          full_name: '',
          role: 'technician',
          site_ids: [],
        });
        onClose();
        // Refresh user list (in real app, refetch from API)
        // setUsers([...users, newUser]);
      }
    } catch (err) {
      setError('Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  const getSiteNames = (siteIds: number[]) => {
    return siteIds
      .map(id => mockSites.find(site => site.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'purple';
      case 'manager': return 'blue';
      case 'technician': return 'green';
      case 'viewer': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <Container maxW="7xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <Box>
            <Heading size="lg" color="brand.500">User Management</Heading>
            <Text color="gray.500" mt={1}>
              Manage local accounts and site access permissions
            </Text>
          </Box>
          <Button
            leftIcon={<UserPlusIcon className="w-4 h-4" />}
            colorScheme="brand"
            onClick={onOpen}
          >
            Create Local Account
          </Button>
        </HStack>

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

        {/* Users Table */}
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardHeader>
            <Text fontSize="lg" fontWeight="semibold">All Users</Text>
          </CardHeader>
          <CardBody>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>User</Th>
                  <Th>Role</Th>
                  <Th>Auth Provider</Th>
                  <Th>Sites</Th>
                  <Th>Created</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {users.map((user) => (
                  <Tr key={user.id}>
                    <Td>
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="medium">{user.full_name}</Text>
                        <Text fontSize="sm" color="gray.500">{user.email}</Text>
                      </VStack>
                    </Td>
                    <Td>
                      <Badge colorScheme={getRoleBadgeColor(user.role)}>
                        {user.role.toUpperCase()}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge variant="outline" colorScheme={user.auth_provider === 'microsoft' ? 'blue' : 'gray'}>
                        {user.auth_provider}
                      </Badge>
                    </Td>
                    <Td>
                      <Text fontSize="sm">{getSiteNames(user.site_ids)}</Text>
                    </Td>
                    <Td>
                      <Text fontSize="sm">{new Date(user.created_at).toLocaleDateString()}</Text>
                    </Td>
                    <Td>
                      <Badge colorScheme={user.is_active ? 'green' : 'red'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </Td>
                    <Td>
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          icon={<EllipsisVerticalIcon className="w-4 h-4" />}
                          variant="ghost"
                          size="sm"
                        />
                        <MenuList>
                          <MenuItem>Edit User</MenuItem>
                          <MenuItem>Reset Password</MenuItem>
                          <MenuItem>Manage Sites</MenuItem>
                          <MenuItem color="red.500">Deactivate</MenuItem>
                        </MenuList>
                      </Menu>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </VStack>

      {/* Create User Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Local Account</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Full Name</FormLabel>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter full name"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Confirm Password</FormLabel>
                <Input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm password"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Role</FormLabel>
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                >
                  <option value="viewer">Viewer</option>
                  <option value="technician">Technician</option>
                  <option value="manager">Manager</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Site Access</FormLabel>
                <CheckboxGroup
                  value={formData.site_ids.map(String)}
                  onChange={(values) => setFormData({ ...formData, site_ids: values.map(Number) })}
                >
                  <Stack spacing={2}>
                    {mockSites.map((site) => (
                      <Checkbox key={site.id} value={String(site.id)}>
                        {site.label}
                      </Checkbox>
                    ))}
                  </Stack>
                </CheckboxGroup>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="brand"
              onClick={handleCreateUser}
              isLoading={isLoading}
              loadingText="Creating..."
            >
              Create User
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default withAdminAuth(AdminUserManagement);
