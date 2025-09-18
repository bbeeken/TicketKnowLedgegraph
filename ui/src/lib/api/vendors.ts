import { z } from 'zod';
import { apiFetch } from './client';

// Vendor schema
export const VendorSchema = z.object({
  vendor_id: z.number(),
  name: z.string(),
  category: z.string(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type Vendor = z.infer<typeof VendorSchema>;

// Asset summary for vendor
export const VendorAssetSchema = z.object({
  asset_id: z.number(),
  site_id: z.number(),
  zone_id: z.number().nullable(),
  type: z.string(),
  model: z.string().nullable(),
  serial: z.string().nullable(),
  location: z.string().nullable(),
  purchase_date: z.string().nullable(),
  warranty_until: z.string().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  site_name: z.string().nullable(),
});

export type VendorAsset = z.infer<typeof VendorAssetSchema>;

// Vendor with assets
export const VendorWithAssetsSchema = VendorSchema.extend({
  assets: z.array(VendorAssetSchema),
});

export type VendorWithAssets = z.infer<typeof VendorWithAssetsSchema>;

// Vendor Service Request schemas
export const VendorServiceRequestSchema = z.object({
  vsr_id: z.number(),
  ticket_id: z.number(),
  vendor_id: z.number(),
  request_type: z.string(),
  status: z.string(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type VendorServiceRequest = z.infer<typeof VendorServiceRequestSchema>;

export const VendorServiceRequestHistorySchema = z.object({
  history_id: z.number(),
  vsr_id: z.number(),
  ticket_id: z.number(),
  vendor_id: z.number(),
  change_type: z.string(),
  old_status: z.string().nullable(),
  new_status: z.string().nullable(),
  old_notes: z.string().nullable(),
  new_notes: z.string().nullable(),
  changed_by: z.number().nullable(),
  changed_at: z.string(),
  metadata: z.string().nullable(),
});
export type VendorServiceRequestHistory = z.infer<typeof VendorServiceRequestHistorySchema>;

// API Functions
export const getVendors = async (): Promise<Vendor[]> => {
  const data = await apiFetch('/vendors');
  return z.array(VendorSchema).parse(data);
};

export const getVendor = async (id: number): Promise<VendorWithAssets> => {
  const data = await apiFetch(`/vendors/${id}`);
  return VendorWithAssetsSchema.parse(data);
};

export const getVendorAssets = async (id: number): Promise<VendorAsset[]> => {
  const data = await apiFetch(`/vendors/${id}/assets`);
  return z.array(VendorAssetSchema).parse(data);
};

// List vendor service requests for a ticket
export async function listVendorServiceRequests(ticket_id: number): Promise<VendorServiceRequest[]> {
  const data = await apiFetch(`/tickets/${ticket_id}/service-requests`);
  return z.array(VendorServiceRequestSchema).parse(data);
}

// Get single vendor service request
export async function getVendorServiceRequest(vsr_id: number): Promise<VendorServiceRequest> {
  const data = await apiFetch(`/service-requests/${vsr_id}`);
  return VendorServiceRequestSchema.parse(data);
}

// Get vendor service request history
export async function getVendorServiceRequestHistory(vsr_id: number): Promise<VendorServiceRequestHistory[]> {
  const data = await apiFetch(`/service-requests/${vsr_id}/history`);
  return z.array(VendorServiceRequestHistorySchema).parse(data);
}

// Update vendor service request status
export async function updateVendorServiceRequestStatus(vsr_id: number, status: string, notes?: string) {
  return apiFetch(`/service-requests/${vsr_id}/status`, { method: 'PATCH', body: JSON.stringify({ status, notes }) });
}

// Create or update a vendor service request linked to a ticket
export async function upsertVendorServiceRequest(payload: { ticket_id: number; vendor_id: number; request_type: string; status?: string; notes?: string; vsr_id?: number; }): Promise<{ vsr_id: number | null }> {
  const { ticket_id, ...rest } = payload;
  return apiFetch(`/tickets/${ticket_id}/service-request`, { method: 'POST', body: JSON.stringify(rest) });
}
