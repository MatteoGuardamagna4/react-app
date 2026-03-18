import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

function getClient() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

const MODEL_CHAIN = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

const RETRY_DELAY_MS = 2000;
const MAX_RETRIES = 2;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export async function callGemini({ prompt, temperature = 0.9, maxTokens = 12000 }) {
  const client = getClient();
  if (!client) return null;

  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAY_MS * attempt;
      console.warn(`[gemini] Retry ${attempt}/${MAX_RETRIES} after ${delay}ms...`);
      await sleep(delay);
    }

    for (const modelId of MODEL_CHAIN) {
      try {
        const model = client.getGenerativeModel({
          model: modelId,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            ...(modelId.includes('2.5') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          },
        });
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (err) {
        lastErr = err;
        const is429 = err.message?.includes('429') || err.status === 429;
        console.warn(`[gemini] ${modelId} failed: ${err.message?.slice(0, 150)}`);
        if (is429) continue;
        throw err;
      }
    }
  }
  throw lastErr;
}
