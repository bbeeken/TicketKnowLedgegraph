import 'dotenv/config';
import { getPool } from '../src/sql';
import { embedText, getEmbeddingDimension } from '../src/ai/embeddings';

async function main() {
  const pool = await getPool();
  console.log('Starting embedding backfill...');

  const pending = await pool.request().query(`
    SELECT TOP (5000) snippet_id, content
    FROM kg.KnowledgeSnippet
    WHERE embedding IS NULL
    ORDER BY snippet_id ASC
  `);

  if (pending.recordset.length === 0) {
    console.log('No snippets require backfill.');
    return;
  }

  const dimHint = getEmbeddingDimension();
  let processed = 0;
  for (const row of pending.recordset) {
    try {
      const { vector, model, provider } = await embedText(row.content.slice(0, 8000));
      await pool.request()
        .input('embedding', Buffer.from(vector.buffer))
        .input('model', model)
        .input('dim', vector.length || dimHint)
        .input('id', row.snippet_id)
        .query(`UPDATE kg.KnowledgeSnippet SET embedding = @embedding, embedding_model = @model, embedding_dim = @dim WHERE snippet_id = @id`);
      processed++;
      if (processed % 50 === 0) console.log(`Processed ${processed}`);
    } catch (err) {
      console.error('Failed embedding for snippet', row.snippet_id, err);
    }
  }

  console.log(`Backfill complete. Updated ${processed} snippets.`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
