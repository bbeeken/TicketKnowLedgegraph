import 'fastify';
import type { ConnectionPool } from 'mssql';

// Knowledge Graph Extension Types
export interface DocumentUpsertRequest {
  source_system: string;
  external_key: string;
  title: string;
  mime_type?: string;
  summary?: string;
  hash?: string;
  ticket_id?: number;
  asset_id?: number;
}

export interface InvoiceUpsertRequest {
  invoice_number: string;
  invoice_date: string; // ISO date
  total_amount?: number;
  currency?: string;
  status?: string;
  vendor_id?: number;
  ticket_id?: number;
}

export interface RemoteSessionUpsertRequest {
  provider: string;
  session_code: string;
  started_at: string; // ISO timestamp
  ended_at?: string;
  technician?: string;
  outcome?: string;
  ticket_id?: number;
  asset_id?: number;
}

export interface ExternalFileLinkRequest {
  system: string;
  external_path: string;
  title?: string;
  file_type?: string;
  ticket_id?: number;
  asset_id?: number;
}

export interface KnowledgeSnippetUpsertRequest {
  source: string;
  label?: string;
  content: string;
  ticket_id?: number;
  asset_id?: number;
  document_id?: number;
}

export interface TicketKnowledgeContextResponse {
  ticket_id: number;
  summary: string;
  status: string;
  category: string | null;
  severity: number | null;
  assets_json?: string;
  vendors_json?: string;
  invoices_json?: string;
  documents_json?: string;
  external_files_json?: string;
  remote_sessions_json?: string;
  snippets_json?: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
  }

  interface FastifyRequest {
    sqlConn?: ConnectionPool;
  }
}
