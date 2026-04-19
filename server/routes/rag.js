import { Router } from 'express';
import { searchKnowledge, isRAGReady } from '../services/rag.js';
import { chatWithGPT4oMini, isOpenAIAvailable } from '../services/openai.js';

const router = Router();

// Mirrors main.py :: rag_query_pdf_ai
router.post('/query', async (req, res) => {
  try {
    const { question, top_k } = req.body || {};
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'question (string) is required' });
    }

    if (!isRAGReady() || !isOpenAIAvailable()) {
      return res.status(503).json({ error: 'RAG not ready. Check OPENAI_API_KEY and Qdrant availability.' });
    }

    const topK = Number.isInteger(top_k) ? top_k : 5;
    const { contexts, sources } = await searchKnowledge(question, topK);

    const contextBlock = contexts.map(c => `- ${c}`).join('\n\n');
    const userContent =
      'Use the following context to answer the question:\n\n' +
      `Context:\n${contextBlock}\n\n` +
      `Question: ${question}\n` +
      'Answer the question based on the context provided.';

    const answer = await chatWithGPT4oMini({
      messages: [
        { role: 'system', content: 'You are a helpful assistant that provides answers based on provided context.' },
        { role: 'user', content: userContent },
      ],
      temperature: 0.2,
      maxTokens: 1024,
    });

    res.json({
      answer: (answer || '').trim(),
      sources,
      num_contexts: contexts.length,
    });
  } catch (err) {
    console.error('RAG query error:', err);
    res.status(500).json({ error: err.message || 'RAG query failed' });
  }
});

export default router;
