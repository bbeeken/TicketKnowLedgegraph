export type Site = {
  site_id: number;
  name: string;
  city?: string | null;
  state?: string | null;
  tz?: string | null;
};

export type AlertOpen = {
  site_id: number;
  alert_id: string;
  raised_at: string; // ISO
  code: string;
  level: string;
  asset_id?: number | null;
  asset_type?: string | null;
  zone_label?: string | null;
  ticket_id?: number | null;
};

export type KGCoFail = {
  site_id: number;
  atg_alert_id: string;
  atg_time: string;
  atg_zone_id: string;
  adj_zone_id?: string | null;
  other_asset_id?: number | null;
  other_code?: string | null;
  other_time?: string | null;
  delta_min: number;
};

export type TicketDetail = {
  ticket_id: number;
  ticket_no?: string;
  status: string;
  substatus_code?: string | null;
  summary?: string | null;
  description?: string | null;
  site_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  rowversionBase64?: string | null;
  type_id?: number | null;
};
