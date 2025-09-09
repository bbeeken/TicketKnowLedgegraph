import { z } from 'zod';

export const ticketSchema = z.object({
  id: z.number(),
  siteId: z.number(),
  categoryId: z.number(),
  status: z.string(),
  substatusCode: z.string().nullable(),
  summary: z.string(),
  description: z.string(),
  priority: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  assignedToId: z.number().nullable(),
  assetId: z.number().nullable()
});

export type Ticket = z.infer<typeof ticketSchema>;

export interface TicketFilters {
  siteId?: number;
  status?: string;
  categoryId?: number;
  assignedToId?: number;
  fromDate?: string;
  toDate?: string;
}

export async function getTickets(filters: TicketFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value.toString());
  });
  
  const response = await fetch(`/api/tickets?${params}`);
  if (!response.ok) throw new Error('Failed to fetch tickets');
  
  const data = await response.json();
  return z.array(ticketSchema).parse(data);
}

export async function getTicket(id: number) {
  const response = await fetch(`/api/tickets/${id}`);
  if (!response.ok) throw new Error('Failed to fetch ticket');
  
  const data = await response.json();
  return ticketSchema.parse(data);
}

export async function createTicket(ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) {
  const response = await fetch('/api/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ticket)
  });
  
  if (!response.ok) throw new Error('Failed to create ticket');
  const data = await response.json();
  return ticketSchema.parse(data);
}

export async function updateTicket(id: number, updates: Partial<Ticket>) {
  const response = await fetch(`/api/tickets/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) throw new Error('Failed to update ticket');
  const data = await response.json();
  return ticketSchema.parse(data);
}

export async function deleteTicket(id: number) {
  const response = await fetch(`/api/tickets/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete ticket');
}
