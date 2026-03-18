import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

function getClient() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

const MODEL_CHAIN = [
  'gemini-3.1-pro',          
  'gemini-3-flash',
  'gemini-3-flash-preview',           
  'gemini-3.1-flash-lite',    
  'gemini-2.5-pro',           
  'gemini-2.5-flash',         
  'gemini-2.5-flash-lite',
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite-preview-02-05",
  "gemini-2.0-pro-exp-02-05",
  "gemini-1.5-pro",
  "gemini-1.5-flash",   
  'gemini-3-deep-think',     
];

export async function callGemini({ prompt, temperature = 0.9, maxTokens = 12000 }) {
  const client = getClient();
  if (!client) return null;

  let lastErr;
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
      if (is429) {
        console.warn(`[gemini] ${modelId} rate-limited, trying next model...`);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
