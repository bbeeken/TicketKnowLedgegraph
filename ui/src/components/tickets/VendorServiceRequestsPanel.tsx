import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Card, CardBody, CardHeader, Flex, Heading, HStack, Text, VStack, Badge, Select, useToast, Spinner,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, FormControl, FormLabel, Textarea
} from '@chakra-ui/react';
import { relativeTime } from '../../utils/dates';
import {
  listVendorServiceRequests,
  upsertVendorServiceRequest,
  updateVendorServiceRequestStatus,
  getVendorServiceRequest,
  getVendorServiceRequestHistory,
  type VendorServiceRequest,
  type VendorServiceRequestHistory,
  type Vendor
} from '@/lib/api/vendors';

interface VendorServiceRequestsPanelProps {
  ticketId: number;
  vendors: Vendor[];
}

// Helper for status color mapping (UI + API normalized)
const statusColor = (status: string) => {
  const s = status.toLowerCase();
  if (s === 'open') return 'blue';
  if (s === 'in_progress' || s === 'in progress') return 'yellow';
  if (s === 'waiting_vendor' || s === 'pending') return 'purple';
  if (s === 'completed') return 'green';
  if (s === 'cancelled' || s === 'canceled') return 'red';
  return 'gray';
};

export const VendorServiceRequestsPanel: React.FC<VendorServiceRequestsPanelProps> = ({ ticketId, vendors }) => {
  const toast = useToast();
  const [serviceRequests, setServiceRequests] = useState<VendorServiceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [creationOpen, setCreationOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedVsr, setSelectedVsr] = useState<VendorServiceRequest | null>(null);
  const [history, setHistory] = useState<VendorServiceRequestHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyCache, setHistoryCache] = useState<Record<number, VendorServiceRequestHistory[]>>({});
  const [form, setForm] = useState<{ vendor_id: number | null; request_type: string; status: string; notes: string }>({ vendor_id: null, request_type: '', status: 'open', notes: '' });
  const [editForm, setEditForm] = useState<{ vendor_id: number | null; request_type: string; status: string; notes: string }>({ vendor_id: null, request_type: '', status: 'open', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [notesMap, setNotesMap] = useState<Record<number, string>>({});

  const loadServiceRequests = useCallback(async () => {
    if (!ticketId) return;
    try {
      setLoading(true);
      const list = await listVendorServiceRequests(ticketId);
      setServiceRequests(list);
      // Initialize notes map with most recent notes per vendor
      setNotesMap(prevMap => {
        const map: Record<number, string> = { ...prevMap };
        for (const r of list) {
          if (r.vendor_id && r.notes) {
            map[r.vendor_id] = r.notes;
          }
        }
        return map;
      });
    } catch (e: any) {
      // Surface richer diagnostics when available
      const desc = e?.body?.error || e?.message || 'Unknown error';
      toast({ status: 'error', title: 'Failed to load service requests', description: desc });
      console.error('Failed to load service requests', e);
    } finally {
      setLoading(false);
    }
  }, [ticketId, toast]);

  // Load service requests with debouncing to prevent rate limiting
  useEffect(() => {
    if (!ticketId) return;
    
    // Add debounce to prevent rapid successive calls
    const timeoutId = setTimeout(() => {
      loadServiceRequests();
    }, 100);
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]); // Only depend on ticketId to prevent infinite loop

  // Persist notes per ticket in localStorage
  useEffect(() => {
    try { localStorage.setItem(`ticket_${ticketId}_vendorNotes`, JSON.stringify(notesMap)); } catch {}
  }, [notesMap, ticketId]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`ticket_${ticketId}_vendorNotes`);
      if (stored) setNotesMap(JSON.parse(stored));
    } catch {}
  }, [ticketId]);

  const handleCreate = async () => {
    if (!form.vendor_id || !form.request_type) {
      toast({ status: 'warning', title: 'Vendor and request type required' });
      return;
    }
    try {
      setSubmitting(true);
      const res = await upsertVendorServiceRequest({
        ticket_id: ticketId,
        vendor_id: form.vendor_id,
        request_type: form.request_type,
        status: form.status,
        notes: form.notes
      });
      if (res?.vsr_id) {
        // Add small delay to prevent rate limiting
        setTimeout(async () => {
          await loadServiceRequests();
        }, 200);
        setNotesMap((m) => ({ ...m, [form.vendor_id!]: form.notes }));
      }
      toast({ status: 'success', title: 'Service request created' });
      setCreationOpen(false);
      setForm({ vendor_id: null, request_type: '', status: 'open', notes: '' });
    } catch (e: any) {
      toast({ status: 'error', title: 'Create failed', description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const openHistory = async (vsr: VendorServiceRequest) => {
    // Prevent multiple rapid clicks
    if (historyLoading) return;
    
    try {
      setHistoryLoading(true);
      setSelectedVsr(vsr);
      setHistoryOpen(true);
      
      // Check cache first
      if (historyCache[vsr.vsr_id]) {
        setHistory(historyCache[vsr.vsr_id]);
        setHistoryLoading(false);
        return;
      }
      
      // Load fresh data with a small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const [full, hist] = await Promise.all([
        getVendorServiceRequest(vsr.vsr_id),
        getVendorServiceRequestHistory(vsr.vsr_id)
      ]);
      
      setSelectedVsr(full);
      setHistory(hist);
      setHistoryCache(prev => ({ ...prev, [vsr.vsr_id]: hist }));
    } catch (e: any) {
      toast({ status: 'error', title: 'Failed to load history', description: e.message });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleStatusChange = async (vsr: VendorServiceRequest, newStatus: string) => {
    try {
      setServiceRequests((list) => list.map(r => r.vsr_id === vsr.vsr_id ? { ...r, status: newStatus } : r));
      await updateVendorServiceRequestStatus(vsr.vsr_id, newStatus, notesMap[vsr.vendor_id]);
      toast({ status: 'success', title: 'Status updated' });
    } catch (e: any) {
      toast({ status: 'error', title: 'Failed to update status', description: e.message });
      // revert
      setServiceRequests((list) => list.map(r => r.vsr_id === vsr.vsr_id ? { ...r, status: vsr.status } : r));
    }
  };

  const openEdit = (vsr: VendorServiceRequest) => {
    setSelectedVsr(vsr);
    setEditForm({
      vendor_id: vsr.vendor_id,
      request_type: vsr.request_type,
      status: vsr.status,
      notes: vsr.notes || ''
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedVsr || !editForm.vendor_id || !editForm.request_type) {
      toast({ status: 'warning', title: 'Vendor and request type required' });
      return;
    }
    try {
      setSubmitting(true);
      await upsertVendorServiceRequest({
        vsr_id: selectedVsr.vsr_id,
        ticket_id: ticketId,
        vendor_id: editForm.vendor_id,
        request_type: editForm.request_type,
        status: editForm.status,
        notes: editForm.notes
      });
      // Add small delay to prevent rate limiting
      setTimeout(async () => {
        await loadServiceRequests();
      }, 200);
      setNotesMap((m) => ({ ...m, [editForm.vendor_id!]: editForm.notes }));
      toast({ status: 'success', title: 'Service request updated' });
      setEditOpen(false);
      setEditForm({ vendor_id: null, request_type: '', status: 'open', notes: '' });
    } catch (e: any) {
      toast({ status: 'error', title: 'Update failed', description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card variant="outline">
      <CardHeader>
        <Flex justify="space-between" align="center">
          <Heading size="sm">Service Requests</Heading>
          <Button size="xs" variant="outline" colorScheme="blue" onClick={() => setCreationOpen(true)}>New</Button>
        </Flex>
      </CardHeader>
      <CardBody>
        <VStack align="stretch" spacing={3}>
          {loading && <Text fontSize="sm">Loading...</Text>}
          {!loading && serviceRequests.filter(r => r.status.toLowerCase() !== 'completed').length > 0 && (
            <Box>
              <Text fontSize="xs" fontWeight="bold" mb={1}>Active</Text>
              <VStack spacing={2} align="stretch">
                {serviceRequests.filter(r => r.status.toLowerCase() !== 'completed').map(r => (
                  <HStack 
                    key={r.vsr_id} 
                    spacing={2} 
                    p={2} 
                    borderWidth="1px" 
                    borderRadius="md" 
                    _hover={{ bg: historyLoading ? 'inherit' : 'gray.50', cursor: historyLoading ? 'not-allowed' : 'pointer' }} 
                    onClick={() => !historyLoading && openHistory(r)}
                    opacity={historyLoading ? 0.6 : 1}
                  >
                    <Badge colorScheme={statusColor(r.status)}>{r.status.replace(/_/g,' ')}</Badge>
                    <Text fontSize="sm" flex={1}>{vendors.find(v => v.vendor_id === r.vendor_id)?.name || 'Vendor'}: {r.request_type}</Text>
                    <Text fontSize="xs" color="gray.500">{relativeTime(r.created_at)}</Text>
                    {historyLoading ? (
                      <Spinner size="xs" />
                    ) : (
                      <Select 
                        size="xs" 
                        width="130px" 
                        value={r.status} 
                        onChange={(e) => handleStatusChange(r, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="waiting_vendor">Waiting Vendor</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </Select>
                    )}
                  </HStack>
                ))}
              </VStack>
            </Box>
          )}
          {!loading && serviceRequests.length === 0 && (
            <Text fontSize="sm" fontStyle="italic" color="gray.500" textAlign="center">No service requests yet.</Text>
          )}
          {!loading && serviceRequests.length > 0 && (
            <VStack spacing={2} align="stretch" pt={2} borderTop="1px solid" borderColor="gray.200">
              {serviceRequests.map(r => (
                <Card 
                  key={r.vsr_id} 
                  variant="subtle" 
                  p={2} 
                  _hover={{ shadow: historyLoading ? 'sm' : 'md', bg: historyLoading ? 'gray.50' : 'gray.100', cursor: historyLoading ? 'not-allowed' : 'pointer' }} 
                  onClick={() => !historyLoading && openHistory(r)}
                  opacity={historyLoading ? 0.6 : 1}
                >
                  <Flex justify="space-between" align="start">
                    <VStack spacing={0} align="start" flex={1}>
                      <HStack>
                        <Text fontSize="sm" fontWeight="semibold">{vendors.find(v => v.vendor_id === r.vendor_id)?.name || 'Vendor'}</Text>
                        <Badge colorScheme={statusColor(r.status)}>{r.status.replace(/_/g,' ')}</Badge>
                        {historyLoading && <Spinner size="xs" />}
                      </HStack>
                      <Text fontSize="xs" color="gray.600">{r.request_type}</Text>
                      {r.notes && <Text fontSize="xs" color="gray.500" noOfLines={2}>{r.notes}</Text>}
                    </VStack>
                    <Text fontSize="xs" color="gray.500">{new Date(r.created_at).toLocaleDateString()}</Text>
                  </Flex>
                </Card>
              ))}
            </VStack>
          )}
        </VStack>
      </CardBody>

      {/* Create Modal */}
      <Modal isOpen={creationOpen} onClose={() => setCreationOpen(false)} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Service Request</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Vendor</FormLabel>
                <Select value={form.vendor_id || ''} onChange={(e) => setForm({ ...form, vendor_id: Number(e.target.value) || null })} placeholder="Select vendor">
                  {vendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.name}</option>)}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Request Type</FormLabel>
                <Select value={form.request_type} onChange={(e) => setForm({ ...form, request_type: e.target.value })} placeholder="Select type">
                  <option value="warranty_claim">Warranty Claim</option>
                  <option value="maintenance_request">Maintenance Request</option>
                  <option value="parts_order">Parts Order</option>
                  <option value="technical_support">Technical Support</option>
                  <option value="installation">Installation</option>
                  <option value="consultation">Consultation</option>
                  <option value="other">Other</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_vendor">Waiting Vendor</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Details, urgency, context" />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setCreationOpen(false)}>Cancel</Button>
            <Button colorScheme="blue" isDisabled={!form.vendor_id || !form.request_type} isLoading={submitting} onClick={handleCreate}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Service Request History</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedVsr && (
              <Box mb={4} p={3} borderWidth="1px" borderRadius="md">
                <Heading size="sm" mb={1}>{vendors.find(v => v.vendor_id === selectedVsr.vendor_id)?.name || 'Vendor'} – {selectedVsr.request_type}</Heading>
                <Badge colorScheme={statusColor(selectedVsr.status)}>{selectedVsr.status.replace(/_/g,' ')}</Badge>
                {selectedVsr.notes && <Text fontSize="sm" mt={2}>{selectedVsr.notes}</Text>}
              </Box>
            )}
            <VStack align="stretch" spacing={3} maxH="400px" overflowY="auto">
              {historyLoading && (
                <VStack spacing={3} py={8}>
                  <Spinner size="lg" color="blue.500" />
                  <Text fontSize="sm" color="gray.500">Loading service request history...</Text>
                </VStack>
              )}
              {!historyLoading && history.length === 0 && <Text fontSize="sm" color="gray.500">No history entries</Text>}
              {!historyLoading && history.map(h => (
                <Card key={h.history_id} variant="outline" p={2}>
                  <VStack spacing={1} align="stretch">
                    <HStack>
                      <Badge colorScheme={statusColor(h.new_status || h.old_status || '')}>{h.change_type}</Badge>
                      <Text fontSize="xs" color="gray.500">{new Date(h.changed_at).toLocaleString()}</Text>
                    </HStack>
                    {(h.old_status || h.new_status) && (
                      <Text fontSize="xs">Status: {h.old_status || '—'} → {h.new_status || '—'}</Text>
                    )}
                    {(h.old_notes || h.new_notes) && (
                      <Text fontSize="xs" whiteSpace="pre-wrap">Notes changed</Text>
                    )}
                  </VStack>
                </Card>
              ))}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => openEdit(selectedVsr!)}>Edit</Button>
            <Button onClick={() => setHistoryOpen(false)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Service Request</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Vendor</FormLabel>
                <Select value={editForm.vendor_id || ''} onChange={(e) => setEditForm({ ...editForm, vendor_id: Number(e.target.value) || null })} placeholder="Select vendor">
                  {vendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.name}</option>)}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Request Type</FormLabel>
                <Select value={editForm.request_type} onChange={(e) => setEditForm({ ...editForm, request_type: e.target.value })} placeholder="Select type">
                  <option value="warranty_claim">Warranty Claim</option>
                  <option value="maintenance_request">Maintenance Request</option>
                  <option value="parts_order">Parts Order</option>
                  <option value="technical_support">Technical Support</option>
                  <option value="installation">Installation</option>
                  <option value="consultation">Consultation</option>
                  <option value="other">Other</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_vendor">Waiting Vendor</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea rows={4} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Details, urgency, context" />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button colorScheme="blue" isDisabled={!editForm.vendor_id || !editForm.request_type} isLoading={submitting} onClick={handleEdit}>Update</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Card>
  );
};

export default VendorServiceRequestsPanel;