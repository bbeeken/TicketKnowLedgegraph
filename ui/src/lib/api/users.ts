import { z } from 'zod';
import { apiFetch } from './client';

export const userSchema = z.object({
  user_id: z.number(),
  name: z.string(),
  email: z.string(),
  role: z.string().nullable(),
  phone: z.string().optional(),
  is_active: z.boolean(),
  created_at: z.string().optional()
});

export type User = z.infer<typeof userSchema>;

export async function getUsers() {
  const data = await apiFetch('/users');
  return z.array(userSchema).parse(data);
}

export async function searchUsers(query: string, limit?: number) {
  const params = new URLSearchParams();
  if (query) params.append('q', query);
  if (limit) params.append('limit', limit.toString());
  
  const data = await apiFetch(`/users/search?${params}`);
  return z.array(userSchema).parse(data);
}

export async function getUser(id: number) {
  const data = await apiFetch(`/users/${id}`);
  return userSchema.parse(data);
}
