/*
 Qdrant vector store integration (REST)

 Env vars:
  - QDRANT_URL: base URL, e.g. http://localhost:6333
  - QDRANT_API_KEY: optional API key for secured deployments
  - QDRANT_COLLECTION: collection name, default 'opsgraph_snippets'

 Usage pattern:
  - if (isEnabled()) await ensureCollection(dim)
  - await upsertPoints([...])
  - const results = await search(vector, topK, { must: [...] })
*/

export type QdrantFilter = {
  must?: Array<{ key: string; match?: { value: string | number | boolean }; range?: { gte?: number; lte?: number } }>;
  should?: Array<{ key: string; match?: { value: string | number | boolean } }>;
  must_not?: Array<{ key: string; match?: { value: string | number | boolean } }>;
};

export interface QdrantPointPayload {
  snippet_id: number;
  document_id?: number;
  attachment_id?: number;
  ticket_id?: number | null;
  asset_id?: number | null;
  site_id?: number | null;
  embedding_model?: string | null;
  created_at?: string;
  mime_type?: string;
  label?: string;
}

export interface QdrantUpsertPoint {
  id: number | string;
  vector: number[] | Float32Array;
  payload?: QdrantPointPayload;
}

const QDRANT_URL = process.env.QDRANT_URL?.replace(/\/$/, '') || '';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || '';
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'opsgraph_snippets';

function headers() {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (QDRANT_API_KEY) h['api-key'] = QDRANT_API_KEY;
  return h;
}

export function isEnabled(): boolean {
  return !!QDRANT_URL;
}

export async function ensureCollection(dimension: number): Promise<{ ok: boolean; created?: boolean; error?: any }> {
  if (!isEnabled()) return { ok: false, error: 'Qdrant not configured' };
  try {
    const res = await fetch(`${QDRANT_URL}/collections/${encodeURIComponent(QDRANT_COLLECTION)}`);
    if (res.ok) return { ok: true, created: false };
    if (res.status !== 404) return { ok: false, error: await safeText(res) };
  } catch (e) {
    return { ok: false, error: e };
  }
  // Create collection
  try {
    const createRes = await fetch(`${QDRANT_URL}/collections/${encodeURIComponent(QDRANT_COLLECTION)}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({
        vectors: { size: dimension, distance: 'Cosine' },
        optimizers_config: { default_segment_number: 2 }
      })
    });
    if (!createRes.ok) return { ok: false, error: await safeText(createRes) };
    return { ok: true, created: true };
  } catch (e) {
    return { ok: false, error: e };
  }
}

export async function upsertPoints(points: QdrantUpsertPoint[]): Promise<{ ok: boolean; error?: any }> {
  if (!isEnabled() || points.length === 0) return { ok: true };
  // Normalize vectors to number[]
  const normalized = points.map(p => ({
    id: p.id,
    vector: Array.from(p.vector as any),
    payload: p.payload
  }));
  try {
    const res = await fetch(`${QDRANT_URL}/collections/${encodeURIComponent(QDRANT_COLLECTION)}/points`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ points: normalized })
    });
    if (!res.ok) return { ok: false, error: await safeText(res) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e };
  }
}

export async function search(vector: Float32Array, topK: number, filter?: QdrantFilter): Promise<Array<{ id: number | string; score: number; payload?: any }>> {
  if (!isEnabled()) return [];
  try {
    const res = await fetch(`${QDRANT_URL}/collections/${encodeURIComponent(QDRANT_COLLECTION)}/points/search`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ vector: Array.from(vector), limit: topK, filter })
    });
    if (!res.ok) throw new Error(await safeText(res));
    const json: any = await res.json();
    const result: any[] = json?.result || [];
    return result.map(r => ({ id: r.id, score: r.score, payload: r.payload }));
  } catch (e) {
    // Soft-fail for now; caller can fallback to in-app scoring
    return [];
  }
}

async function safeText(res: Response): Promise<string> {
  try { return await res.text(); } catch { return `${res.status}`; }
}
