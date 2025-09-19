import { z } from 'zod';
import { apiFetch, apiFetchResponse } from './client';

// Asset schema
export const AssetSchema = z.object({
  asset_id: z.number(),
  site_id: z.number(),
  zone_id: z.number().nullable().transform(val => val ?? null),
  type: z.string(),
  model: z.string().nullable().transform(val => val ?? null),
  vendor_id: z.number().nullable().transform(val => val ?? null),
  vendor_name: z.string().nullable().transform(val => val ?? null),
  serial: z.string().nullable().transform(val => val ?? null),
  location: z.string().nullable().transform(val => val ?? null),
  purchase_date: z.string().nullable().transform(val => val ?? null),
  warranty_until: z.string().nullable().transform(val => val ?? null),
  status: z.string().optional().default('operational'),
  installed_at: z.string().nullable().optional().transform(val => val ?? null),
  images: z.array(z.object({
    image_id: z.number(),
    uri: z.string(),
    mime_type: z.string(),
    size_bytes: z.number(),
    uploaded_by: z.number(),
    uploaded_at: z.string()
  })).optional()
});

export type Asset = z.infer<typeof AssetSchema>;

// Create/Update asset payload
export interface CreateAssetPayload {
  asset_id?: number;
  site_id: number;
  zone_id?: number | null;
  type: string;
  model?: string | null;
  vendor_id?: number | null;
  serial?: string | null;
  location?: string | null;
  purchase_date?: string | null;
  warranty_until?: string | null;
}

// Asset Image
export interface AssetImage {
  image_id: number;
  uri: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: number;
  uploaded_at: string;
}

// Maintenance record
export interface MaintenanceRecord {
  maintenance_id: number;
  asset_id: number;
  scheduled_at: string | null;
  performed_by: number | null;
  notes: string | null;
  created_at: string;
}

// API Functions
export const getAssets = async (): Promise<Asset[]> => {
  const data = await apiFetch('/assets');
  return z.array(AssetSchema).parse(data);
};

export const getAsset = async (id: number): Promise<Asset> => {
  const response = await apiFetch(`/assets/${id}`);
  return AssetSchema.parse(response);
};

export const createAsset = async (payload: CreateAssetPayload): Promise<{ asset_id: number }> => {
  return await apiFetch('/assets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
};

export const updateAsset = async (payload: CreateAssetPayload): Promise<{ asset_id: number }> => {
  return await apiFetch('/assets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
};

export const uploadAssetImage = async (assetId: number, file: File): Promise<AssetImage> => {
  const formData = new FormData();
  formData.append('file', file);

  return await apiFetch(`/assets/${assetId}/images`, {
    method: 'POST',
    body: formData,
  });
};

export const scheduleAssetMaintenance = async (
  assetId: number, 
  payload: { scheduled_at?: string; notes?: string }
): Promise<{ maintenance_id: number }> => {
  return await apiFetch(`/assets/${assetId}/maintenance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
};

export const updateAssetStatus = async (
  assetId: number,
  status: string,
  notes?: string
): Promise<{ asset_id: number; old_status: string; new_status: string; updated_at: string }> => {
  return await apiFetch(`/assets/${assetId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status, notes }),
  });
};

// Get asset maintenance notes
export const getAssetMaintenanceNotes = async (
  assetId: number
): Promise<{ notes: string | null; created_at: string | null; performed_at?: string | null; performed_by?: number | null }> => {
  return await apiFetch(`/assets/${assetId}/maintenance/notes`, {
    method: 'GET',
  });
};

// Asset Attachments API
export const assetAttachmentSchema = z.object({
  attachment_id: z.number(),
  asset_id: z.number(),
  filename: z.string(),
  original_filename: z.string(),
  file_size: z.number(),
  mime_type: z.string(),
  kind: z.string(),
  uploaded_by: z.number(),
  uploaded_by_name: z.string().nullable(),
  uploaded_at: z.string()
});

export type AssetAttachment = z.infer<typeof assetAttachmentSchema>;

export async function uploadAssetAttachment(assetId: number, file: File, kind: string = 'documentation') {
  const form = new FormData();
  form.append('file', file);
  form.append('kind', kind);
  return apiFetch(`/assets/${assetId}/attachments`, { method: 'POST', body: form });
}

export async function getAssetAttachments(assetId: number) {
  return apiFetch(`/assets/${assetId}/attachments`, { method: 'GET' })
    .then(data => z.array(assetAttachmentSchema).parse(data));
}

export async function downloadAssetAttachment(assetId: number, attachmentId: number) {
  const response = await apiFetchResponse(`/assets/${assetId}/attachments/${attachmentId}/download`, { method: 'GET' });
  return response;
}

export async function deleteAssetAttachment(assetId: number, attachmentId: number) {
  return apiFetch(`/assets/${assetId}/attachments/${attachmentId}`, { method: 'DELETE' });
}
