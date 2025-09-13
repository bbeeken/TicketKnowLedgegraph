import { z } from 'zod';
import { apiFetch } from './client';

export const ticketSchema = z.object({
  ticket_id: z.number(),
  ticket_no: z.string().nullable(),
  summary: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  substatus_code: z.string().nullable(),
  substatus_name: z.string().nullable(),
  severity: z.number(),
  // Optional type fields if provided by backend
  type_id: z.number().nullable().optional(),
  type_name: z.string().nullable().optional(),
  category_id: z.number().nullable(),
  category_name: z.string().nullable(),
  site_id: z.number(),
  site_name: z.string().nullable(),
  privacy_level: z.enum(['public', 'site_only', 'private']).nullable(),
  assignee_user_id: z.number().nullable(),
  assignee_name: z.string().nullable(),
  team_id: z.number().nullable(),
  created_by: z.number(),
  created_by_name: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  is_private: z.union([z.boolean(), z.number()]).nullable().transform(val => val === 1 || val === true),
  contact_name: z.string().nullable(),
  contact_email: z.string().nullable(),
  contact_phone: z.string().nullable(),
  problem_description: z.string().nullable(),
  watcher_count: z.number().nullable(),
  collaborator_count: z.number().nullable()
});

export type Ticket = z.infer<typeof ticketSchema>;

export const privacyLevelSchema = z.object({
  privacy_level: z.enum(['public', 'site_only', 'private']),
  display_name: z.string(),
  description: z.string(),
  sort_order: z.number()
});

export type PrivacyLevel = z.infer<typeof privacyLevelSchema>;

export const substatusSchema = z.object({
  substatus_id: z.number(),
  substatus_code: z.string(),
  substatus_name: z.string(),
  sort_order: z.number()
});

export type Substatus = z.infer<typeof substatusSchema>;

// Metadata schemas for dropdowns
export const siteSchema = z.object({
  site_id: z.number(),
  name: z.string(),
  display_name: z.string().nullable()
});

export const categorySchema = z.object({
  category_id: z.number(),
  name: z.string(),
  description: z.string().nullable()
});

export const userSchema = z.object({
  user_id: z.number(),
  name: z.string(),
  email: z.string(),
  role: z.string().nullable()
});

export const statusSchema = z.object({
  status_code: z.string(),
  status_name: z.string(),
  description: z.string().nullable()
});

export const fullSubstatusSchema = z.object({
  substatus_code: z.string(),
  substatus_name: z.string(),
  status_code: z.string(),
  description: z.string().nullable()
});

export const ticketTypeSchema = z.object({
  type_id: z.number(),
  type_name: z.string()
});

export const ticketMetadataSchema = z.object({
  sites: z.array(siteSchema),
  categories: z.array(categorySchema),
  users: z.array(userSchema),
  statuses: z.array(statusSchema),
  substatuses: z.array(fullSubstatusSchema),
  types: z.array(ticketTypeSchema).optional()
});

export type Site = z.infer<typeof siteSchema>;
export type Category = z.infer<typeof categorySchema>;
export type User = z.infer<typeof userSchema>;
export type Status = z.infer<typeof statusSchema>;
export type FullSubstatus = z.infer<typeof fullSubstatusSchema>;
export type TicketType = z.infer<typeof ticketTypeSchema>;
export type TicketMetadata = z.infer<typeof ticketMetadataSchema>;

// Watchers
export const ticketWatcherSchema = z.object({
  watcher_id: z.number(),
  ticket_id: z.number().optional(),
  user_id: z.number().nullable(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  watcher_type: z.enum(['interested','collaborator','site_contact','assignee_backup']).or(z.string()),
  added_at: z.string().optional()
});
export type TicketWatcher = z.infer<typeof ticketWatcherSchema>;

export interface CreateTicketPayload {
  summary: string;
  description?: string;
  status?: string;
  substatus_code?: string;
  site_id?: number;
  category_id?: number;
  severity: number;
  privacy_level: 'public' | 'site_only' | 'private';
  assignee_user_id?: number;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  problem_description?: string;
  watchers?: any[];
}

export interface UpdateTicketPayload {
  assignee_user_id?: number;
  category_id?: number;
  site_id?: number;
  status?: string;
  substatus_code?: string;
  severity?: number;
  summary?: string;
  description?: string;
  privacy_level?: string;
  is_private?: boolean;
  // Contact + problem fields
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  problem_description?: string | null;
}

export interface TicketFilters {
  siteId?: number;
  status?: string;
  categoryId?: number;
  assignedToId?: number;
  fromDate?: string;
  toDate?: string;
  privacy_level?: string;
}

export async function getTickets(filters: TicketFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value.toString());
  });
  
  const data = await apiFetch(`/tickets?${params}`);
  return z.array(ticketSchema).parse(data);
}

export async function getTicket(id: number) {
  const data = await apiFetch(`/tickets/${id}`);
  return ticketSchema.parse(data);
}

export async function createTicket(ticket: CreateTicketPayload) {
  return apiFetch('/tickets', {
    method: 'POST',
    body: JSON.stringify(ticket)
  });
}

export async function updateTicket(id: number, updates: Partial<Ticket>) {
  return apiFetch(`/tickets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

export async function updateTicketFields(id: number, updates: UpdateTicketPayload) {
  return apiFetch(`/tickets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ data: updates })
  });
}

export async function getTicketMetadata(): Promise<TicketMetadata> {
  const data = await apiFetch('/tickets/metadata');
  return ticketMetadataSchema.parse(data);
}

export async function deleteTicket(id: number) {
  return apiFetch(`/tickets/${id}`, { method: 'DELETE' });
}

export async function getPrivacyLevels() {
  const data = await apiFetch('/privacy-levels');
  return z.array(privacyLevelSchema).parse(data);
}

export async function getSubstatuses() {
  const data = await apiFetch('/substatuses');
  const result: Record<string, Substatus[]> = {};
  for (const [status, substatuses] of Object.entries(data)) {
    result[status] = z.array(substatusSchema).parse(substatuses);
  }
  return result;
}

export async function getTicketMessages(id: number, offset = 0, limit = 50) {
  return apiFetch(`/tickets/${id}/messages?offset=${offset}&limit=${limit}`);
}

export async function postTicketMessage(id: number, payload: any) {
  return apiFetch(`/tickets/${id}/messages`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function patchTicketType(id: number, type_id: number) {
  return apiFetch(`/tickets/${id}/type`, { method: 'PATCH', body: JSON.stringify({ type_id }) });
}

// Watchers API
export async function getTicketWatchers(ticketId: number): Promise<TicketWatcher[]> {
  const data = await apiFetch(`/tickets/${ticketId}/watchers`);
  return z.array(ticketWatcherSchema).parse(data);
}

export async function addTicketWatcher(ticketId: number, payload: { user_id?: number | null; email?: string | null; name?: string | null; watcher_type?: 'interested' | 'collaborator' | 'site_contact' | 'assignee_backup'; notification_preferences?: string; }) {
  return apiFetch(`/tickets/${ticketId}/watchers`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function removeTicketWatcher(ticketId: number, watcherId: number) {
  return apiFetch(`/tickets/${ticketId}/watchers/${watcherId}`, { method: 'DELETE' });
}

// Attachments API
export async function uploadTicketAttachment(ticketId: number, file: File, kind: string = 'other') {
  const form = new FormData();
  form.append('file', file);
  form.append('kind', kind);
  return apiFetch(`/tickets/${ticketId}/attachments`, { method: 'POST', body: form });
}
