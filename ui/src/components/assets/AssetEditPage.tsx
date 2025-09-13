import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Textarea,
  Select,
  FormControl,
  FormLabel,
  Card,
  CardBody,
  CardHeader,
  Grid,
  GridItem,
  Divider,
  Alert,
  AlertIcon,
  Spinner,
  useToast,
  Badge,
  IconButton,
  Image,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import {
  PencilIcon,
  PhotoIcon,
  TrashIcon,
  CalendarIcon,
  WrenchScrewdriverIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import { Asset, getAsset, updateAsset, uploadAssetImage, scheduleAssetMaintenance } from '../../lib/api/assets';

export interface AssetEditPageProps {
  assetId?: number;
}

const AssetEditPage: React.FC<AssetEditPageProps> = ({ assetId }) => {
  const router = useRouter();
  const toast = useToast();
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const bgColor = useColorModeValue('white', 'gray.800');
  
  // Modals
  const { isOpen: isImageModalOpen, onOpen: onImageModalOpen, onClose: onImageModalClose } = useDisclosure();
  const { isOpen: isMaintenanceModalOpen, onOpen: onMaintenanceModalOpen, onClose: onMaintenanceModalClose } = useDisclosure();

  // State
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    site_id: 0,
    zone_id: null as number | null,
    type: '',
    model: '',
    vendor_id: null as number | null,
    serial: '',
    location: '',
    purchase_date: '',
    warranty_until: '',
  });

  // Image upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Maintenance scheduling
  const [maintenanceData, setMaintenanceData] = useState({
    scheduled_at: '',
    notes: '',
  });

  const id = assetId || Number(router.query.id);

  const loadAsset = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const assetData = await getAsset(id);
      setAsset(assetData);
      
      // Populate form data
      setFormData({
        site_id: assetData.site_id,
        zone_id: assetData.zone_id,
        type: assetData.type,
        model: assetData.model || '',
        vendor_id: assetData.vendor_id,
        serial: assetData.serial || '',
        location: assetData.location || '',
        purchase_date: assetData.purchase_date || '',
        warranty_until: assetData.warranty_until || '',
      });
    } catch (error) {
      console.error('Failed to load asset:', error);
      toast({
        title: 'Error',
        description: 'Failed to load asset details',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (id) {
      loadAsset();
    }
  }, [id, loadAsset]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateAsset({
        asset_id: id,
        ...formData,
      });
      
      toast({
        title: 'Success',
        description: 'Asset updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      setEditMode(false);
      await loadAsset(); // Reload to get updated data
    } catch (error) {
      console.error('Failed to save asset:', error);
      toast({
        title: 'Error',
        description: 'Failed to save asset',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedFile || !id) return;
    
    try {
      setUploadingImage(true);
      await uploadAssetImage(id, selectedFile);
      
      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      setSelectedFile(null);
      onImageModalClose();
      await loadAsset(); // Reload to get updated images
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload image',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleScheduleMaintenance = async () => {
    if (!id) return;
    
    try {
      await scheduleAssetMaintenance(id, maintenanceData);
      
      toast({
        title: 'Success',
        description: 'Maintenance scheduled successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      setMaintenanceData({ scheduled_at: '', notes: '' });
      onMaintenanceModalClose();
    } catch (error) {
      console.error('Failed to schedule maintenance:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule maintenance',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (!asset) {
    return (
      <Alert status="error">
        <AlertIcon />
        Asset not found
      </Alert>
    );
  }

  return (
    <Box maxW="6xl" mx="auto" p={6}>
      {/* Header */}
      <HStack justifyContent="space-between" mb={6}>
        <VStack align="start" spacing={1}>
          <Text fontSize="2xl" fontWeight="bold">
            Asset Details
          </Text>
          <HStack>
            <Badge colorScheme="blue">ID: {asset.asset_id}</Badge>
            <Badge colorScheme="green">{asset.type}</Badge>
          </HStack>
        </VStack>
        
        <HStack>
          {!editMode ? (
            <>
              <Button
                leftIcon={<PencilIcon className="w-4 h-4" />}
                colorScheme="blue"
                onClick={() => setEditMode(true)}
              >
                Edit Asset
              </Button>
              <Button
                leftIcon={<PhotoIcon className="w-4 h-4" />}
                variant="outline"
                onClick={onImageModalOpen}
              >
                Add Image
              </Button>
              <Button
                leftIcon={<WrenchScrewdriverIcon className="w-4 h-4" />}
                variant="outline"
                onClick={onMaintenanceModalOpen}
              >
                Schedule Maintenance
              </Button>
            </>
          ) : (
            <>
              <Button
                colorScheme="green"
                onClick={handleSave}
                isLoading={saving}
                loadingText="Saving..."
              >
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditMode(false);
                  // Reset form data
                  setFormData({
                    site_id: asset.site_id,
                    zone_id: asset.zone_id,
                    type: asset.type,
                    model: asset.model || '',
                    vendor_id: asset.vendor_id,
                    serial: asset.serial || '',
                    location: asset.location || '',
                    purchase_date: asset.purchase_date || '',
                    warranty_until: asset.warranty_until || '',
                  });
                }}
              >
                Cancel
              </Button>
            </>
          )}
        </HStack>
      </HStack>

      <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
        {/* Main Details */}
        <Card>
          <CardHeader>
            <Text fontSize="lg" fontWeight="semibold">Asset Information</Text>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <FormControl>
                  <FormLabel>Site ID</FormLabel>
                  {editMode ? (
                    <Input
                      type="number"
                      value={formData.site_id}
                      onChange={(e) => setFormData({ ...formData, site_id: Number(e.target.value) })}
                    />
                  ) : (
                    <Text>{asset.site_id}</Text>
                  )}
                </FormControl>

                <FormControl>
                  <FormLabel>Zone ID</FormLabel>
                  {editMode ? (
                    <Input
                      type="number"
                      value={formData.zone_id || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        zone_id: e.target.value ? Number(e.target.value) : null 
                      })}
                    />
                  ) : (
                    <Text>{asset.zone_id || 'N/A'}</Text>
                  )}
                </FormControl>

                <FormControl>
                  <FormLabel>Type</FormLabel>
                  {editMode ? (
                    <Input
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    />
                  ) : (
                    <Text>{asset.type}</Text>
                  )}
                </FormControl>

                <FormControl>
                  <FormLabel>Model</FormLabel>
                  {editMode ? (
                    <Input
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    />
                  ) : (
                    <Text>{asset.model || 'N/A'}</Text>
                  )}
                </FormControl>

                <FormControl>
                  <FormLabel>Vendor</FormLabel>
                  {editMode ? (
                    <Input
                      type="number"
                      placeholder="Vendor ID"
                      value={formData.vendor_id || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        vendor_id: e.target.value ? Number(e.target.value) : null 
                      })}
                    />
                  ) : (
                    <Text>{asset.vendor_name || asset.vendor_id || 'N/A'}</Text>
                  )}
                </FormControl>

                <FormControl>
                  <FormLabel>Serial Number</FormLabel>
                  {editMode ? (
                    <Input
                      value={formData.serial}
                      onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
                    />
                  ) : (
                    <Text>{asset.serial || 'N/A'}</Text>
                  )}
                </FormControl>

                <FormControl gridColumn="span 2">
                  <FormLabel>Location</FormLabel>
                  {editMode ? (
                    <Textarea
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  ) : (
                    <Text>{asset.location || 'N/A'}</Text>
                  )}
                </FormControl>

                <FormControl>
                  <FormLabel>Purchase Date</FormLabel>
                  {editMode ? (
                    <Input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    />
                  ) : (
                    <Text>{asset.purchase_date || 'N/A'}</Text>
                  )}
                </FormControl>

                <FormControl>
                  <FormLabel>Warranty Until</FormLabel>
                  {editMode ? (
                    <Input
                      type="date"
                      value={formData.warranty_until}
                      onChange={(e) => setFormData({ ...formData, warranty_until: e.target.value })}
                    />
                  ) : (
                    <Text>{asset.warranty_until || 'N/A'}</Text>
                  )}
                </FormControl>
              </Grid>
            </VStack>
          </CardBody>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <HStack justifyContent="space-between">
              <Text fontSize="lg" fontWeight="semibold">Images</Text>
              <IconButton
                aria-label="Add image"
                icon={<PlusIcon className="w-4 h-4" />}
                size="sm"
                onClick={onImageModalOpen}
              />
            </HStack>
          </CardHeader>
          <CardBody>
            {asset.images && asset.images.length > 0 ? (
              <VStack spacing={4}>
                {asset.images.map((image) => (
                  <Box key={image.image_id} w="full">
                    <Image
                      src={`/api/attachments/${image.uri}`}
                      alt="Asset image"
                      borderRadius="md"
                      maxH="200px"
                      objectFit="cover"
                    />
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      {(image.size_bytes / 1024).toFixed(1)} KB
                    </Text>
                  </Box>
                ))}
              </VStack>
            ) : (
              <Text color="gray.500" textAlign="center">
                No images uploaded
              </Text>
            )}
          </CardBody>
        </Card>
      </Grid>

      {/* Image Upload Modal */}
      <Modal isOpen={isImageModalOpen} onClose={onImageModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Upload Asset Image</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Select Image</FormLabel>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </FormControl>
              {selectedFile && (
                <Text fontSize="sm" color="gray.600">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </Text>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              onClick={handleImageUpload}
              isDisabled={!selectedFile}
              isLoading={uploadingImage}
              loadingText="Uploading..."
              mr={3}
            >
              Upload
            </Button>
            <Button variant="outline" onClick={onImageModalClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Maintenance Scheduling Modal */}
      <Modal isOpen={isMaintenanceModalOpen} onClose={onMaintenanceModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Schedule Maintenance</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Scheduled Date & Time</FormLabel>
                <Input
                  type="datetime-local"
                  value={maintenanceData.scheduled_at}
                  onChange={(e) => setMaintenanceData({ 
                    ...maintenanceData, 
                    scheduled_at: e.target.value 
                  })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea
                  placeholder="Maintenance notes and instructions..."
                  value={maintenanceData.notes}
                  onChange={(e) => setMaintenanceData({ 
                    ...maintenanceData, 
                    notes: e.target.value 
                  })}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              onClick={handleScheduleMaintenance}
              mr={3}
            >
              Schedule
            </Button>
            <Button variant="outline" onClick={onMaintenanceModalClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AssetEditPage;
