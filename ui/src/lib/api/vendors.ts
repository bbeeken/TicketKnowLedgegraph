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
