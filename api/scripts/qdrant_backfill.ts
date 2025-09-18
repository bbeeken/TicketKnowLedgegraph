// Backfill existing snippet embeddings into Qdrant
// Usage: npx tsx scripts/qdrant_backfill.ts
import { config } from 'dotenv';
config();
import mssql from 'mssql';
import { upsertPoints, ensureCollection, isEnabled as qdrantEnabled } from '../src/ai/vector/qdrant';
import { getEmbeddingDimension } from '../src/ai/embeddings';

const BATCH_SIZE = 200;

async function main() {
  if (!qdrantEnabled()) throw new Error('Qdrant not configured (QDRANT_URL)');
  const dim = getEmbeddingDimension();
  const ensure = await ensureCollection(dim);
  if (!ensure.ok) throw new Error('Qdrant collection not ready: ' + (ensure.error || 'unknown'));

  const pool = await mssql.connect(process.env.DB_CONNECTION_STRING!);
  let lastId = 0;
  let total = 0;
  while (true) {
    const res = await pool.request()
      .input('lastId', lastId)
      .input('batch', BATCH_SIZE)
      .query(`SELECT TOP (@batch) snippet_id, document_id, content, embedding, embedding_model, created_at
              FROM kg.KnowledgeSnippet
              WHERE snippet_id > @lastId AND embedding IS NOT NULL
              ORDER BY snippet_id ASC`);
    const rows = res.recordset;
    if (!rows.length) break;
    const points = rows.map((r: any) => ({
      id: r.snippet_id,
      vector: bufferToFloat32Array(r.embedding),
      payload: {
        snippet_id: r.snippet_id,
        document_id: r.document_id,
        embedding_model: r.embedding_model,
        created_at: r.created_at,
        // Optionally add more fields if needed
      }
    }));
    const up = await upsertPoints(points);
    if (!up.ok) throw new Error('Qdrant upsert failed: ' + (up.error || 'unknown'));
    lastId = rows[rows.length - 1].snippet_id;
    total += rows.length;
    console.log(`Upserted ${rows.length} (total ${total}) through snippet_id ${lastId}`);
  }
  console.log('Backfill complete.');
  process.exit(0);
}

function bufferToFloat32Array(buf: Buffer): Float32Array {
  const arr = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
  return new Float32Array(arr);
}

main().catch(e => { console.error(e); process.exit(1); });
