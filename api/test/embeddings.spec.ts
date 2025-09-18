import { describe, it, expect } from 'vitest';

describe('embeddings provider', () => {
  it('returns deterministic mock when no API key', async () => {
    if (process.env.OPENAI_API_KEY) {
      expect(true).toBe(true);
      return;
    }
    process.env.OPENAI_EMBED_ALLOW_FALLBACK = 'true';
    const { embedText } = await import('../src/ai/embeddings');
    const text = 'Test embedding text';
    const r1 = await embedText(text);
    const r2 = await embedText(text);
    expect(r1.vector.length).toBeGreaterThan(0);
    expect(r1.vector.length).toBe(r2.vector.length);
    for (let i = 0; i < 5; i++) {
      expect(r1.vector[i]).toBeCloseTo(r2.vector[i], 10);
    }
    expect(r1.provider).toBe('mock');
  });

  it('exposes embedding dimension hint', async () => {
    process.env.OPENAI_EMBED_ALLOW_FALLBACK = process.env.OPENAI_EMBED_ALLOW_FALLBACK || 'true';
    const { getEmbeddingDimension } = await import('../src/ai/embeddings');
    const dim = getEmbeddingDimension();
    expect(dim).toBeGreaterThan(0);
  });
});
