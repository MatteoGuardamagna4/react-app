import { embedText } from './openai.js';
import { searchSimilar, ensureCollection, getCollectionInfo, isQdrantAvailable } from './qdrant.js';
import { isOpenAIAvailable } from './openai.js';

let ragReady = false;

export async function initializeRAG() {
  if (!isOpenAIAvailable()) {
    console.warn('RAG unavailable: OPENAI_API_KEY not set');
    return false;
  }
  if (!isQdrantAvailable()) {
    console.warn('RAG unavailable: QDRANT_URL or QDRANT_API_KEY not set');
    return false;
  }

  try {
    const collectionOk = await ensureCollection();
    if (!collectionOk) {
      console.warn('RAG unavailable: could not ensure Qdrant collection');
      return false;
    }

    const info = await getCollectionInfo();
    const count = info?.pointsCount ?? 0;
    console.log(`RAG initialized -- Qdrant collection has ${count} vectors`);

    ragReady = true;
    return true;
  } catch (err) {
    console.error('RAG initialization failed:', err.message);
    return false;
  }
}

export async function retrieveContext(query, topK = 5) {
  const empty = { chunks: [], sources: [] };
  if (!ragReady) return empty;

  try {
    const queryEmbedding = await embedText(query);
    if (!queryEmbedding) return empty;

    const results = await searchSimilar(queryEmbedding, topK);
    if (results.length === 0) return empty;

    const seen = new Map();
    for (const r of results) {
      if (r.source && !seen.has(r.source)) {
        seen.set(r.source, { name: r.source, url: r.url || null });
      }
    }
    const sources = [...seen.values()];

    const chunks = results.map(r => ({
      text: r.text,
      source: r.source,
      url: r.url || null,
      sourceIndex: sources.findIndex(s => s.name === r.source) + 1,
    }));

    return { chunks, sources };
  } catch (err) {
    console.error('RAG retrieval error:', err.message);
    return empty;
  }
}

export async function searchKnowledge(query, topK = 5) {
  if (!ragReady) {
    return { contexts: [], sources: [] };
  }

  try {
    const queryEmbedding = await embedText(query);
    if (!queryEmbedding) {
      return { contexts: [], sources: [] };
    }

    const results = await searchSimilar(queryEmbedding, topK);
    const contexts = results.map(r => r.text).filter(Boolean);
    const seen = new Map();
    for (const r of results) {
      if (r.source && !seen.has(r.source)) {
        seen.set(r.source, { name: r.source, url: r.url || null });
      }
    }
    return { contexts, sources: [...seen.values()] };
  } catch (err) {
    console.error('RAG search error:', err.message);
    return { contexts: [], sources: [] };
  }
}

export function isRAGReady() {
  return ragReady;
}
