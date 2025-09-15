import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Card,
  CardHeader,
  CardBody,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  useToast,
  useColorModeValue,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  Icon,
  Divider,
  Badge,
  Progress,
  List,
  ListItem,
  ListIcon,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Checkbox,
  RadioGroup,
  Radio,
  Stack,
  Flex
} from '@chakra-ui/react';
import { 
  ChevronRightIcon, 
  ArrowLeftIcon,
  DocumentPlusIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  XMarkIcon,
  DocumentTextIcon,
  PhotoIcon,
  VideoCameraIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';

export default function AddDocumentationPage() {
  const router = useRouter();
  const { type, assetId, ticketId } = router.query;
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const toast = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'manual',
    documentType: 'procedure',
    tags: '',
    visibility: 'internal',
    relatedAsset: assetId || '',
    relatedTicket: ticketId || ''
  });

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textPrimary = useColorModeValue('gray.900', 'white');
  const textSecondary = useColorModeValue('gray.600', 'gray.300');

  const documentCategories = [
    { value: 'manual', label: 'User Manual' },
    { value: 'procedure', label: 'Procedure' },
    { value: 'troubleshooting', label: 'Troubleshooting Guide' },
    { value: 'specification', label: 'Technical Specification' },
    { value: 'safety', label: 'Safety Document' },
    { value: 'training', label: 'Training Material' },
    { value: 'compliance', label: 'Compliance Document' },
    { value: 'other', label: 'Other' }
  ];

  const documentTypes = [
    { value: 'procedure', label: '📋 Standard Procedure' },
    { value: 'guide', label: '📖 Step-by-Step Guide' },
    { value: 'reference', label: '📚 Reference Material' },
    { value: 'checklist', label: '✅ Checklist' },
    { value: 'diagram', label: '📊 Diagram/Schematic' },
    { value: 'video', label: '🎥 Video Tutorial' },
    { value: 'photo', label: '📷 Photo Documentation' }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles(prevFiles => [...prevFiles, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return DocumentTextIcon;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return PhotoIcon;
      case 'mp4':
      case 'avi':
      case 'mov':
        return VideoCameraIcon;
      default:
        return DocumentIcon;
    }
  };

  const getFileIconColor = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'red.500';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'green.500';
      case 'mp4':
      case 'avi':
      case 'mov':
        return 'purple.500';
      default:
        return 'gray.500';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({
        title: 'Title Required',
        description: 'Please enter a title for the documentation.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (files.length === 0) {
      toast({
        title: 'Files Required',
        description: 'Please select at least one file to upload.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Here you would implement the actual upload logic
      console.log('Uploading documentation:', {
        formData,
        files: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
      });

      toast({
        title: 'Documentation Added Successfully',
        description: `${files.length} file(s) uploaded and documentation created.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'manual',
        documentType: 'procedure',
        tags: '',
        visibility: 'internal',
        relatedAsset: assetId as string || '',
        relatedTicket: ticketId as string || ''
      });
      setFiles([]);
      setUploadProgress(0);

      // Navigate back
      setTimeout(() => {
        router.back();
      }, 1500);

    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'There was an error uploading the documentation. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box bg={bgColor} minH="100vh" py={8}>
      <Container maxW="container.lg">
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <Box>
            <Breadcrumb spacing="8px" separator={<ChevronRightIcon width={16} />}>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => router.back()} color="blue.500">
                  {ticketId ? 'Tickets' : 'Assets'}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem isCurrentPage>
                <BreadcrumbLink>Add Documentation</BreadcrumbLink>
              </BreadcrumbItem>
            </Breadcrumb>
            
            <HStack justify="space-between" align="center" mt={4}>
              <Heading size="lg" color={textPrimary}>
                📝 Add Documentation
              </Heading>
              <Button 
                leftIcon={<Icon as={ArrowLeftIcon} />} 
                variant="outline" 
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </HStack>
            
            <Text color={textSecondary} mt={2}>
              Upload and organize documentation for assets and tickets
            </Text>
          </Box>

          <Divider />

          {/* Main Form */}
          <Card bg={cardBg} shadow="md" borderColor={borderColor}>
            <CardHeader>
              <HStack spacing={2}>
                <Icon as={DocumentPlusIcon} color="blue.500" />
                <Heading size="md">Document Information</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack spacing={6} align="stretch">
                {/* Basic Information */}
                <VStack spacing={4} align="stretch">
                  <FormControl isRequired>
                    <FormLabel>Title</FormLabel>
                    <Input
                      placeholder="Enter document title..."
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Description</FormLabel>
                    <Textarea
                      placeholder="Describe the content and purpose of this documentation..."
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={4}
                    />
                  </FormControl>

                  <HStack spacing={4} align="start">
                    <FormControl>
                      <FormLabel>Category</FormLabel>
                      <Select
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                      >
                        {documentCategories.map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Visibility</FormLabel>
                      <RadioGroup 
                        value={formData.visibility}
                        onChange={(value) => setFormData({...formData, visibility: value})}
                      >
                        <Stack direction="row" spacing={6}>
                          <Radio value="internal">Internal Only</Radio>
                          <Radio value="public">Public</Radio>
                        </Stack>
                      </RadioGroup>
                    </FormControl>
                  </HStack>

                  <FormControl>
                    <FormLabel>Document Type</FormLabel>
                    <RadioGroup 
                      value={formData.documentType}
                      onChange={(value) => setFormData({...formData, documentType: value})}
                    >
                      <Stack spacing={2}>
                        {documentTypes.map((docType) => (
                          <Radio key={docType.value} value={docType.value}>
                            {docType.label}
                          </Radio>
                        ))}
                      </Stack>
                    </RadioGroup>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Tags</FormLabel>
                    <Input
                      placeholder="Enter tags separated by commas (e.g., maintenance, safety, procedure)"
                      value={formData.tags}
                      onChange={(e) => setFormData({...formData, tags: e.target.value})}
                    />
                  </FormControl>
                </VStack>

                <Divider />

                {/* Associations */}
                <VStack spacing={4} align="stretch">
                  <Heading size="sm" color={textPrimary}>Associations</Heading>
                  
                  <HStack spacing={4}>
                    <FormControl>
                      <FormLabel>Related Asset ID</FormLabel>
                      <Input
                        placeholder="Asset ID (optional)"
                        value={formData.relatedAsset}
                        onChange={(e) => setFormData({...formData, relatedAsset: e.target.value})}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Related Ticket ID</FormLabel>
                      <Input
                        placeholder="Ticket ID (optional)"
                        value={formData.relatedTicket}
                        onChange={(e) => setFormData({...formData, relatedTicket: e.target.value})}
                      />
                    </FormControl>
                  </HStack>
                </VStack>
              </VStack>
            </CardBody>
          </Card>

          {/* File Upload */}
          <Card bg={cardBg} shadow="md" borderColor={borderColor}>
            <CardHeader>
              <HStack spacing={2}>
                <Icon as={CloudArrowUpIcon} color="green.500" />
                <Heading size="md">File Upload</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                {/* Upload Area */}
                <Box
                  border="2px dashed"
                  borderColor={files.length > 0 ? "green.300" : borderColor}
                  borderRadius="lg"
                  p={8}
                  textAlign="center"
                  cursor="pointer"
                  _hover={{ borderColor: "blue.300", bg: "blue.50" }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <VStack spacing={3}>
                    <Icon as={CloudArrowUpIcon} boxSize={12} color="gray.400" />
                    <VStack spacing={1}>
                      <Text fontSize="lg" fontWeight="semibold" color={textPrimary}>
                        Drop files here or click to browse
                      </Text>
                      <Text fontSize="sm" color={textSecondary}>
                        Supports PDF, images, videos, and documents up to 50MB each
                      </Text>
                    </VStack>
                    <Button size="sm" colorScheme="blue" variant="outline">
                      Choose Files
                    </Button>
                  </VStack>
                </Box>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov,.txt,.xls,.xlsx,.ppt,.pptx"
                />

                {/* Selected Files */}
                {files.length > 0 && (
                  <VStack spacing={3} align="stretch">
                    <HStack justify="space-between">
                      <Text fontSize="sm" fontWeight="semibold" color={textPrimary}>
                        Selected Files ({files.length})
                      </Text>
                      <Button 
                        size="xs" 
                        variant="ghost" 
                        colorScheme="red"
                        onClick={() => setFiles([])}
                      >
                        Clear All
                      </Button>
                    </HStack>
                    
                    <List spacing={2}>
                      {files.map((file, index) => (
                        <ListItem key={index}>
                          <Flex
                            p={3}
                            bg="gray.50"
                            borderRadius="md"
                            align="center"
                            justify="space-between"
                          >
                            <HStack spacing={3} flex={1}>
                              <Icon 
                                as={getFileIcon(file.name)} 
                                color={getFileIconColor(file.name)}
                                boxSize={5}
                              />
                              <VStack align="start" spacing={0} flex={1}>
                                <Text fontSize="sm" fontWeight="medium" color={textPrimary}>
                                  {file.name}
                                </Text>
                                <Text fontSize="xs" color={textSecondary}>
                                  {formatFileSize(file.size)}
                                </Text>
                              </VStack>
                            </HStack>
                            <Button
                              size="xs"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => removeFile(index)}
                            >
                              <Icon as={XMarkIcon} boxSize={4} />
                            </Button>
                          </Flex>
                        </ListItem>
                      ))}
                    </List>
                  </VStack>
                )}

                {/* Upload Progress */}
                {uploading && (
                  <VStack spacing={3}>
                    <Progress 
                      value={uploadProgress} 
                      colorScheme="blue" 
                      size="lg" 
                      w="full"
                      borderRadius="md"
                    />
                    <Text fontSize="sm" color={textSecondary}>
                      Uploading... {uploadProgress}%
                    </Text>
                  </VStack>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* Action Buttons */}
          <HStack justify="end" spacing={4}>
            <Button 
              variant="outline" 
              onClick={() => router.back()}
              isDisabled={uploading}
            >
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleSubmit}
              isLoading={uploading}
              loadingText="Uploading..."
              leftIcon={<Icon as={DocumentPlusIcon} />}
            >
              Add Documentation
            </Button>
          </HStack>
        </VStack>
      </Container>
    </Box>
  );
}