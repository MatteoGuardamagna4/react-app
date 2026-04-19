import { QdrantClient } from '@qdrant/js-client-rest';

const COLLECTION_NAME = 'fitness_knowledge';
const VECTOR_SIZE = 3072; // text-embedding-3-large dimension

let client = null;

function getClient() {
  if (!client && process.env.QDRANT_URL && process.env.QDRANT_API_KEY) {
    client = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });
  }
  return client;
}

export async function ensureCollection() {
  const qdrant = getClient();
  if (!qdrant) return false;

  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

    if (!exists) {
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
      });
      console.log(`Created Qdrant collection: ${COLLECTION_NAME}`);
    }
    return true;
  } catch (err) {
    console.error('Qdrant collection setup failed:', err.message);
    return false;
  }
}

export async function upsertChunks(chunks, embeddings) {
  const qdrant = getClient();
  if (!qdrant) return false;

  const points = chunks.map((chunk, i) => ({
    id: chunk.id,
    vector: embeddings[i],
    payload: {
      source: chunk.source,
      text: chunk.text,
      ...(chunk.url ? { url: chunk.url } : {}),
    },
  }));

  const batchSize = 50;
  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize);
    await qdrant.upsert(COLLECTION_NAME, { points: batch });
  }

  return true;
}

export async function searchSimilar(queryEmbedding, topK = 5) {
  const qdrant = getClient();
  if (!qdrant) return [];

  try {
    const results = await qdrant.search(COLLECTION_NAME, {
      vector: queryEmbedding,
      limit: topK,
      with_payload: true,
    });

    return results.map(r => ({
      text: r.payload.text,
      source: r.payload.source,
      url: r.payload.url || null,
      score: r.score,
    }));
  } catch (err) {
    console.error('Qdrant search error:', err.message);
    return [];
  }
}

export async function getCollectionInfo() {
  const qdrant = getClient();
  if (!qdrant) return null;

  try {
    const info = await qdrant.getCollection(COLLECTION_NAME);
    return { pointsCount: info.points_count, status: info.status };
  } catch {
    return null;
  }
}

export function isQdrantAvailable() {
  return !!(process.env.QDRANT_URL && process.env.QDRANT_API_KEY);
}
