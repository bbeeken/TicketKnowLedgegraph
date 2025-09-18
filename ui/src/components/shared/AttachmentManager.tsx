import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  HStack,
  VStack,
  Text,
  Card,
  CardHeader,
  CardBody,
  Icon,
  IconButton,
  Badge,
  Progress,
  useToast,
  useColorModeValue,
  Flex,
  Divider,
  Alert,
  AlertIcon,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Select,
  Image,
  Center,
  Spinner
} from '@chakra-ui/react';
import {
  PaperClipIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  PhotoIcon,
  VideoCameraIcon,
  DocumentIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { apiFetchResponse } from '@/lib/api/client';

export interface Attachment {
  attachment_id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  kind: string;
  uploaded_by?: number;
  uploaded_by_name?: string | null;
  uploaded_at: string;
}

interface AttachmentManagerProps {
  attachments: Attachment[];
  onUpload: (file: File, kind?: string) => Promise<void>;
  onDownload: (attachmentId: number, filename: string) => Promise<void>;
  onDelete: (attachmentId: number) => Promise<void>;
  onRefresh: () => Promise<void>;
  isLoading?: boolean;
  uploadProgress?: number;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  showKindSelector?: boolean;
  ticketId?: number; // For preview URLs
}

export function AttachmentManager({
  attachments,
  onUpload,
  onDownload,
  onDelete,
  onRefresh,
  isLoading = false,
  uploadProgress = 0,
  maxFileSize = 50,
  acceptedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.mp4', '.avi', '.mov', '.txt', '.xls', '.xlsx', '.ppt', '.pptx'],
  showKindSelector = true,
  ticketId
}: AttachmentManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedKind, setSelectedKind] = useState('documentation');
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewObjectUrlState, setPreviewObjectUrlState] = useState<string | null>(null); // for render
  const [previewTextContentState, setPreviewTextContentState] = useState<string | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const previewTextContentRef = useRef<string | null>(null);
  const setPreviewObjectUrl = (val: string | null) => {
    previewObjectUrlRef.current = val;
    setPreviewObjectUrlState(val);
  };
  const setPreviewTextContent = (val: string | null) => {
    previewTextContentRef.current = val;
    setPreviewTextContentState(val);
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isPreviewOpen, onOpen: onPreviewOpen, onClose: onPreviewClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textPrimary = useColorModeValue('gray.900', 'white');
  const textSecondary = useColorModeValue('gray.600', 'gray.300');

  const attachmentKinds = [
    { value: 'documentation', label: '📋 Documentation' },
    { value: 'manual', label: '📖 Manual' },
    { value: 'diagram', label: '📊 Diagram' },
    { value: 'photo', label: '📷 Photo' },
    { value: 'video', label: '🎥 Video' },
    { value: 'certificate', label: '🏆 Certificate' },
    { value: 'report', label: '📝 Report' },
    { value: 'other', label: '📎 Other' }
  ];

  const getFileIcon = (mimeType: string, filename: string) => {
    if (mimeType.startsWith('image/')) return PhotoIcon;
    if (mimeType.startsWith('video/')) return VideoCameraIcon;
    if (mimeType.includes('pdf')) return DocumentTextIcon;
    return DocumentIcon;
  };

  const getFileIconColor = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'green.500';
    if (mimeType.startsWith('video/')) return 'purple.500';
    if (mimeType.includes('pdf')) return 'red.500';
    return 'gray.500';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxFileSize * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: `File size must be less than ${maxFileSize}MB`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setUploading(true);
    try {
      await onUpload(file, selectedKind);
      toast({
        title: 'File Uploaded',
        description: `${file.name} has been uploaded successfully.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Refresh attachments list
      await onRefresh();
    } catch (error: any) {
      const dup = (error?.status === 409) || (typeof error?.body === 'object' && (error.body?.error?.toString()?.toLowerCase()?.includes('duplicate') || error.body?.message?.toString()?.toLowerCase()?.includes('duplicate')));
      toast({
        title: dup ? 'Duplicate file' : 'Upload Failed',
        description: dup ? 'An attachment with identical content already exists for this ticket.' : 'There was an error uploading the file. Please try again.',
        status: dup ? 'warning' : 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      await onDownload(attachment.attachment_id, attachment.original_filename);
      toast({
        title: 'Download Started',
        description: `Downloading ${attachment.original_filename}`,
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'There was an error downloading the file.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    
    try {
      await onDelete(deleteId);
      toast({
        title: 'File Deleted',
        description: 'The attachment has been deleted successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      await onRefresh();
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: 'There was an error deleting the file.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setDeleteId(null);
      onClose();
    }
  };

  const openDeleteDialog = (attachmentId: number) => {
    setDeleteId(attachmentId);
    onOpen();
  };

  const handlePreview = (attachment: Attachment) => {
    setPreviewAttachment(attachment);
    onPreviewOpen();
  };

  const canPreview = (mimeType: string) => {
    return mimeType.startsWith('image/') || mimeType === 'application/pdf' || mimeType.startsWith('text/');
  };

  // Reentrancy guarded preview loader
  const lastPreviewIdRef = useRef<number | null>(null);
  const loadingRef = useRef(false);

  // We intentionally do not include previewObjectUrl / previewTextContent in deps to avoid refetch loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!previewAttachment || !ticketId) return;
      // Avoid refetching same attachment while object URL exists
  if (lastPreviewIdRef.current === previewAttachment.attachment_id && (previewObjectUrlRef.current || previewTextContentRef.current)) return;
      if (loadingRef.current) return; // already fetching
      loadingRef.current = true;
      lastPreviewIdRef.current = previewAttachment.attachment_id;
      setPreviewLoading(true);
      setPreviewTextContent(null);
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        setPreviewObjectUrl(null);
      }
      try {
        const { data, response } = await apiFetchResponse<Blob>(`/tickets/${ticketId}/attachments/${previewAttachment.attachment_id}/download`, { method: 'GET' });
        if (cancelled) return;
        let blob: Blob = data instanceof Blob ? data : await response.blob();
        if (previewAttachment.mime_type.startsWith('text/')) {
          const text = await blob.text();
          if (!cancelled) setPreviewTextContent(text);
        } else {
          const url = URL.createObjectURL(blob);
          if (!cancelled) setPreviewObjectUrl(url);
        }
      } catch (e: any) {
        if (!cancelled) {
          toast({ title: 'Preview failed', description: e?.message || 'Unable to load attachment', status: 'error' });
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
        loadingRef.current = false;
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [previewAttachment, ticketId, toast]);

  return (
    <Card bg={cardBg} shadow="md" borderColor={borderColor}>
      <CardHeader>
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Icon as={PaperClipIcon} color="blue.500" />
            <Text fontSize="lg" fontWeight="semibold" color={textPrimary}>
              Attachments ({attachments.length})
            </Text>
          </HStack>
          <Button
            size="sm"
            colorScheme="blue"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            isLoading={uploading}
            loadingText="Uploading..."
            leftIcon={<Icon as={CloudArrowUpIcon} />}
          >
            Add File
          </Button>
        </HStack>
      </CardHeader>

      <CardBody>
        <VStack spacing={4} align="stretch">
          {/* Upload Interface */}
          <Box>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              accept={acceptedTypes.join(',')}
            />
            
            {showKindSelector && (
              <HStack spacing={2} mb={2}>
                <Text fontSize="sm" color={textSecondary}>Type:</Text>
                <Select 
                  value={selectedKind} 
                  onChange={(e) => setSelectedKind(e.target.value)}
                  size="sm"
                  maxW="200px"
                >
                  {attachmentKinds.map((kind) => (
                    <option key={kind.value} value={kind.value}>
                      {kind.label}
                    </option>
                  ))}
                </Select>
              </HStack>
            )}

            {uploading && uploadProgress > 0 && (
              <Progress 
                value={uploadProgress} 
                colorScheme="blue" 
                size="sm" 
                borderRadius="md"
                mb={3}
              />
            )}
          </Box>

          <Divider />

          {/* Attachments List */}
          {isLoading ? (
            <Text textAlign="center" color={textSecondary}>Loading attachments...</Text>
          ) : attachments.length === 0 ? (
            <Alert status="info">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text>No attachments yet. Upload files to get started.</Text>
                <Text fontSize="xs" color={textSecondary}>
                  Accepted types: {acceptedTypes.join(', ')}
                </Text>
                <Text fontSize="xs" color={textSecondary}>
                  Max size: {maxFileSize} MB per file
                </Text>
              </VStack>
            </Alert>
          ) : (
            <VStack spacing={3} align="stretch">
              {attachments.map((attachment) => (
                <Box
                  key={attachment.attachment_id}
                  p={3}
                  bg={bgColor}
                  borderRadius="md"
                  border="1px solid"
                  borderColor={borderColor}
                >
                  <Flex justify="space-between" align="center">
                    <HStack spacing={3} flex={1}>
                      <Icon 
                        as={getFileIcon(attachment.mime_type, attachment.filename)} 
                        color={getFileIconColor(attachment.mime_type)}
                        boxSize={5}
                      />
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontSize="sm" fontWeight="medium" color={textPrimary}>
                          {attachment.original_filename}
                        </Text>
                        <HStack spacing={4} fontSize="xs" color={textSecondary}>
                          <Text>{formatFileSize(attachment.file_size)}</Text>
                          <Badge size="xs" colorScheme="purple">
                            {attachment.kind}
                          </Badge>
                          <Text>{formatDate(attachment.uploaded_at)}</Text>
                          {attachment.uploaded_by_name && (
                            <Text>by {attachment.uploaded_by_name}</Text>
                          )}
                        </HStack>
                      </VStack>
                    </HStack>
                    
                    <HStack spacing={1}>
                      {canPreview(attachment.mime_type) && (
                        <Tooltip label="Preview">
                          <IconButton
                            size="sm"
                            variant="ghost"
                            aria-label="Preview"
                            icon={<Icon as={EyeIcon} />}
                            onClick={() => handlePreview(attachment)}
                          />
                        </Tooltip>
                      )}
                      <Tooltip label="Download">
                        <IconButton
                          size="sm"
                          variant="ghost"
                          aria-label="Download"
                          icon={<Icon as={ArrowDownTrayIcon} />}
                          onClick={() => handleDownload(attachment)}
                        />
                      </Tooltip>
                      <Tooltip label="Delete">
                        <IconButton
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          aria-label="Delete"
                          icon={<Icon as={TrashIcon} />}
                          onClick={() => openDeleteDialog(attachment.attachment_id)}
                        />
                      </Tooltip>
                    </HStack>
                  </Flex>
                </Box>
              ))}
            </VStack>
          )}
        </VStack>
      </CardBody>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Attachment
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this attachment? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteConfirm} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Preview Modal */}
      <Modal isOpen={isPreviewOpen} onClose={onPreviewClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Preview: {previewAttachment?.original_filename}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {previewAttachment && (
              <Center minH="400px">
                {previewLoading && (
                  <VStack>
                    <Spinner />
                    <Text fontSize="sm" color="gray.500">Loading preview…</Text>
                  </VStack>
                )}
                {!previewLoading && previewAttachment.mime_type.startsWith('image/') && previewObjectUrlState && (
                  <Image src={previewObjectUrlState} alt={previewAttachment.original_filename} maxH="70vh" maxW="100%" objectFit="contain" />
                )}
                {!previewLoading && previewAttachment.mime_type === 'application/pdf' && previewObjectUrlState && (
                  <iframe src={previewObjectUrlState} width="100%" height="600px" style={{ border: 'none' }} title={previewAttachment.original_filename} />
                )}
                {!previewLoading && previewAttachment.mime_type.startsWith('text/') && (
                  <Box w="100%" h="400px" overflow="auto" p={4} bg={bgColor} borderRadius="md">
                    <Text fontFamily="mono" fontSize="sm" whiteSpace="pre-wrap">{previewTextContentState || '(empty file)'}</Text>
                  </Box>
                )}
                {!previewLoading && !previewAttachment.mime_type.startsWith('text/') && !previewAttachment.mime_type.startsWith('image/') && previewAttachment.mime_type !== 'application/pdf' && (
                  <VStack>
                    <Icon as={DocumentIcon} boxSize={16} color="gray.400" />
                    <Text color="gray.500">Preview not available for this file type</Text>
                    <Button onClick={() => handleDownload(previewAttachment)}>Download to View</Button>
                  </VStack>
                )}
              </Center>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Card>
  );
}