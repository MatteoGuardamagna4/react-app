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

export async function retrieveContext(query, topK = 3) {
  if (!ragReady) {
    return { contextText: '', sources: [] };
  }

  try {
    const queryEmbedding = await embedText(query);
    if (!queryEmbedding) {
      return { contextText: '', sources: [] };
    }

    const results = await searchSimilar(queryEmbedding, topK);
    if (results.length === 0) {
      return { contextText: '', sources: [] };
    }

    const contextText = results
      .map(r => `[Source: ${r.source} > ${r.section}]\n${r.content}`)
      .join('\n\n');

    const sources = results.map(r => ({
      source: r.source,
      section: r.section,
      score: r.score,
    }));

    return { contextText, sources };
  } catch (err) {
    console.error('RAG retrieval error:', err.message);
    return { contextText: '', sources: [] };
  }
}

export function isRAGReady() {
  return ragReady;
}
