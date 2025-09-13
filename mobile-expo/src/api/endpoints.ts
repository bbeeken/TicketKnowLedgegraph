import axios from './axios';
import type { Site, AlertOpen, KGCoFail, TicketDetail } from '../types/api';

export async function login(username: string, password: string) {
  const res = await axios.post('/auth/login', { username, password });
  return res.data;
}

export async function refreshToken(refreshToken: string) {
  const res = await axios.post('/auth/refresh', { refreshToken });
  return res.data;
}

export async function getSites(): Promise<Site[]> {
  const res = await axios.get('/sites');
  return res.data;
}

export async function getAlerts(siteId: number, sinceIso: string): Promise<AlertOpen[]> {
  const res = await axios.get('/alerts/open', { params: { site_id: siteId, since: sinceIso } });
  return res.data;
}

export async function getCofails(siteId: number, minutes = 120): Promise<KGCoFail[]> {
  const res = await axios.get('/kg/cofails', { params: { site_id: siteId, minutes } });
  return res.data;
}

export async function getTickets(siteId: number, status = 'open') {
  const res = await axios.get('/tickets', { params: { site_id: siteId, status } });
  return res.data;
}

export async function getTicket(id: number): Promise<TicketDetail> {
  const res = await axios.get(`/tickets/${id}`);
  return res.data;
}

export async function createTicket(payload: any) {
  const res = await axios.post('/tickets', payload);
  return res.data;
}

export async function patchTicket(id: number, payload: any, etag?: string) {
  const headers: any = {};
  if (etag) headers['If-Match'] = etag;
  const res = await axios.patch(`/tickets/${id}`, payload, { headers });
  return res;
}

// Messaging & types (mobile)
export async function getTicketMessages(id: number, offset = 0, limit = 50) {
  const res = await axios.get(`/tickets/${id}/messages`, { params: { offset, limit } });
  return res.data;
}

export async function postTicketMessage(id: number, body: string) {
  const res = await axios.post(`/tickets/${id}/messages`, { content_format: 'text', body });
  return res.data;
}

export async function patchTicketType(id: number, type_id: number) {
  const res = await axios.patch(`/tickets/${id}/type`, { type_id });
  return res.data;
}

export async function upsertVendorServiceRequest(id: number, payload: any) {
  const res = await axios.post(`/tickets/${id}/service-request`, payload);
  return res.data;
}
