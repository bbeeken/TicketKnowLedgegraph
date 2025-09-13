import { z } from 'zod';
import { apiFetch } from './client';

// Asset schema
export const AssetSchema = z.object({
  asset_id: z.number(),
  site_id: z.number(),
  zone_id: z.number().nullable(),
  type: z.string(),
  model: z.string().nullable(),
  vendor_id: z.number().nullable(),
  vendor_name: z.string().nullable(),
  serial: z.string().nullable(),
  location: z.string().nullable(),
  purchase_date: z.string().nullable(),
  warranty_until: z.string().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
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
