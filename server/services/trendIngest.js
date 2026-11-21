import { chatWithGPT4oMini, embedTexts, isOpenAIAvailable } from './openai.js';
import { ensureCollection, upsertChunks, isQdrantAvailable } from './qdrant.js';
import { chunkText, uuidv5 } from './chunker.js';

function kebab(s) {
  return String(s || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function yyyymm() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Pick which docs to generate: 2 for trend[0], 2 for trend[1], 1 for trend[2] = 5 total.
function docPlan(trends) {
  const t = trends || [];
  const plan = [];
  if (t[0]) { plan.push({ trend: t[0], docType: 'overview' }); plan.push({ trend: t[0], docType: 'deep-dive' }); }
  if (t[1]) { plan.push({ trend: t[1], docType: 'overview' }); plan.push({ trend: t[1], docType: 'deep-dive' }); }
  if (t[2]) { plan.push({ trend: t[2], docType: 'overview' }); }
  return plan.slice(0, 5);
}

function buildPrompt(trend, docType) {
  const exercises = (trend.exercises || []).map(e => `${e.name} (${e.duration || 'n/a'})`).join('; ');
  const base = `Trend name: ${trend.name}
Short description: ${trend.description}
Signature exercises: ${exercises || 'n/a'}`;

  if (docType === 'overview') {
    return `${base}

Write a comprehensive overview briefing on this fitness trend. 900-1200 words, plain prose (no markdown headers, no bullet lists). Cover: what the trend is, why it is popular right now, underlying physiology and adaptations, who it suits best (training experience, goals, limitations), typical session structure, and the evidence base. Be factual and specific. Avoid marketing language.`;
  }

  return `${base}

Write a practical deep-dive briefing on this fitness trend. 900-1200 words, plain prose (no markdown headers, no bullet lists). Cover: optimal programming variables (frequency, volume, intensity, rep ranges), progression strategies over 4-12 weeks, common technique mistakes, injury risks and how to mitigate them, recovery considerations (sleep, soreness, deload timing), and nutrition alignment (protein, carbs around sessions). Be specific with numbers where possible.`;
}

async function generateDoc(trend, docType) {
  const content = await chatWithGPT4oMini({
    messages: [
      { role: 'system', content: 'You are an evidence-based fitness educator writing knowledge briefings for a domain retrieval system. Output plain prose only.' },
      { role: 'user', content: buildPrompt(trend, docType) },
    ],
    jsonMode: false,
    temperature: 0.5,
    maxTokens: 2000,
  });
  return content || '';
}

export async function ingestTrendKnowledge(trendsResult) {
  if (!isOpenAIAvailable() || !isQdrantAvailable()) {
    console.warn('[trendIngest] skipped -- OpenAI or Qdrant unavailable');
    return { ingested: 0 };
  }

  const trends = trendsResult?.trends || [];
  if (trends.length === 0) {
    console.warn('[trendIngest] no trends to ingest');
    return { ingested: 0 };
  }

  const plan = docPlan(trends);
  const month = yyyymm();

  console.log(`[trendIngest] generating ${plan.length} knowledge docs for ${month}...`);

  const docs = [];
  for (const { trend, docType } of plan) {
    try {
      const text = await generateDoc(trend, docType);
      if (!text || text.trim().length < 200) continue;
      const sourceId = `trend:${kebab(trend.name)}:${month}:${docType}`;
      docs.push({ sourceId, text: text.trim() });
      console.log(`[trendIngest] generated ${sourceId} (${text.length} chars)`);
    } catch (err) {
      console.error(`[trendIngest] doc generation failed for ${trend.name}/${docType}:`, err.message);
    }
  }

  if (docs.length === 0) return { ingested: 0 };

  const allChunks = [];
  for (const doc of docs) {
    const pieces = chunkText(doc.text);
    pieces.forEach((content, i) => {
      allChunks.push({
        id: uuidv5(`${doc.sourceId}:${i}`),
        text: content,
        source: doc.sourceId,
      });
    });
  }

  const embeddings = await embedTexts(allChunks.map(c => c.text));
  if (!embeddings) {
    console.error('[trendIngest] embedding failed');
    return { ingested: 0 };
  }

  await ensureCollection();
  await upsertChunks(allChunks, embeddings);

  console.log(`[trendIngest] upserted ${allChunks.length} chunks across ${docs.length} docs`);
  return { ingested: allChunks.length, docs: docs.length };
}
