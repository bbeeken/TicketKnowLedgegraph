import { z } from 'zod';

export const alertSchema = z.object({
  id: z.number(),
  siteId: z.number(),
  assetId: z.number(),
  code: z.string(),
  level: z.string(),
  raisedAt: z.string(),
  resolvedAt: z.string().nullable(),
  ticketId: z.number().nullable(),
  status: z.string(),
  vendorCode: z.string(),
  vendorPayload: z.record(z.unknown()).nullable()
});

export type Alert = z.infer<typeof alertSchema>;

export interface AlertFilters {
  siteId?: number;
  assetId?: number;
  level?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export async function getAlerts(filters: AlertFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value.toString());
  });
  
  const response = await fetch(`/api/alerts?${params}`);
  if (!response.ok) throw new Error('Failed to fetch alerts');
  
  const data = await response.json();
  return z.array(alertSchema).parse(data);
}

export async function getAlert(id: number) {
  const response = await fetch(`/api/alerts/${id}`);
  if (!response.ok) throw new Error('Failed to fetch alert');
  
  const data = await response.json();
  return alertSchema.parse(data);
}

export async function acknowledgeAlert(id: number) {
  const response = await fetch(`/api/alerts/${id}/acknowledge`, { method: 'POST' });
  if (!response.ok) throw new Error('Failed to acknowledge alert');
  
  const data = await response.json();
  return alertSchema.parse(data);
}

export async function resolveAlert(id: number, resolution?: string) {
  const response = await fetch(`/api/alerts/${id}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolution })
  });
  
  if (!response.ok) throw new Error('Failed to resolve alert');
  const data = await response.json();
  return alertSchema.parse(data);
}

// Subscribe to real-time alert updates
export function subscribeToAlerts(onAlert: (alert: Alert) => void) {
  const eventSource = new EventSource('/api/alerts/stream');
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onAlert(alertSchema.parse(data));
  };
  
  return () => eventSource.close();
}
