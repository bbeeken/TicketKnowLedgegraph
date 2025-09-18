import crypto from 'crypto';

// In-memory LRU cache for embeddings (simple Map based)
interface CacheEntry { value: Float32Array; ts: number; }
const MAX_CACHE = parseInt(process.env.EMBED_CACHE_MAX || '500');
const cache: Map<string, CacheEntry> = new Map();

function getFromCache(key: string): Float32Array | null {
  const hit = cache.get(key);
  if (!hit) return null;
  cache.delete(key); // refresh LRU
  cache.set(key, hit);
  return hit.value;
}

function putInCache(key: string, vec: Float32Array) {
  if (MAX_CACHE <= 0) return;
  if (cache.has(key)) cache.delete(key);
  cache.set(key, { value: vec, ts: Date.now() });
  if (cache.size > MAX_CACHE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
}

// Simple OpenAI embeddings provider with graceful fallback.
// Environment variables:
//  - OPENAI_API_KEY (required for real calls)
//  - OPENAI_EMBED_MODEL (optional, default: text-embedding-3-small)
//  - OPENAI_BASE_URL (optional, override e.g. Azure/OpenAI proxy)

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const ALLOW_FALLBACK = process.env.OPENAI_EMBED_ALLOW_FALLBACK === 'true';

export interface EmbeddingResult {
  model: string;
  vector: Float32Array;
  usage?: { prompt_tokens: number; total_tokens: number };
  provider: 'openai' | 'mock';
  cached?: boolean;
}

// Deterministic mock embedding (stable across restarts for same input)
function deterministicMockEmbedding(text: string, dims = 512): Float32Array {
  const hash = crypto.createHash('sha256').update(text).digest();
  const arr = new Float32Array(dims);
  // Expand hash deterministically
  for (let i = 0; i < dims; i++) {
    const byte = hash[i % hash.length];
    // map byte (0..255) -> (-0.5 .. 0.5)
    arr[i] = (byte / 255) - 0.5;
  }
  return arr;
}

export async function embedText(text: string): Promise<EmbeddingResult> {
  const key = `${OPENAI_EMBED_MODEL}:${text}`;
  const cached = getFromCache(key);
  if (cached) {
    return { model: OPENAI_EMBED_MODEL, vector: cached, provider: OPENAI_API_KEY ? 'openai' : 'mock', cached: true };
  }

  if (!OPENAI_API_KEY) {
    if (!ALLOW_FALLBACK) {
      throw new Error('OPENAI_API_KEY missing and fallback disabled (set OPENAI_EMBED_ALLOW_FALLBACK=true to enable deterministic mock).');
    }
    const vector = deterministicMockEmbedding(text);
    putInCache(key, vector);
    return {
      model: 'mock-deterministic-512',
      vector,
      provider: 'mock'
    };
  }

  try {
    const res = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        input: text,
        model: OPENAI_EMBED_MODEL
      })
    });

    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(`OpenAI embeddings failed: ${res.status} ${errTxt}`);
    }
    const json: any = await res.json();
    const dataVector: number[] = json?.data?.[0]?.embedding;
    if (!Array.isArray(dataVector)) {
      throw new Error('Invalid embedding response shape');
    }
    const vector = Float32Array.from(dataVector);
    putInCache(key, vector);
    return {
      model: json.model || OPENAI_EMBED_MODEL,
      vector,
      usage: json.usage,
      provider: 'openai'
    };
  } catch (err) {
    if (ALLOW_FALLBACK) {
      const vector = deterministicMockEmbedding(text);
      putInCache(key, vector);
      return { model: 'mock-deterministic-512-fallback', vector, provider: 'mock' };
    }
    throw err;
  }
}

export function getEmbeddingDimension(): number {
  // For downstream schema decisions; if using mock we return 512 now.
  if (!OPENAI_API_KEY) return 512;
  // Known dims for popular models (extend as needed)
  switch (OPENAI_EMBED_MODEL) {
    case 'text-embedding-3-small': return 1536;
    case 'text-embedding-3-large': return 3072;
    case 'text-embedding-ada-002': return 1536; // legacy
    default: return 1536; // assume typical size
  }
}
