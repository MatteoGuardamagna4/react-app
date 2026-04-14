import OpenAI from 'openai';

let client = null;

function getClient() {
  if (!client && process.env.OPENAI_API_KEY) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function embedText(text) {
  const openai = getClient();
  if (!openai) return null;

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
  });
  return response.data[0].embedding;
}

export async function embedTexts(texts) {
  const openai = getClient();
  if (!openai) return null;

  const batchSize = 20;
  const allEmbeddings = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: batch,
    });
    const sorted = response.data.sort((a, b) => a.index - b.index);
    allEmbeddings.push(...sorted.map(d => d.embedding));
  }

  return allEmbeddings;
}

export async function chatWithGPT4oMini({ messages, jsonMode = false, temperature = 0.7, maxTokens = 2000 }) {
  const openai = getClient();
  if (!openai) return null;

  const params = {
    model: 'gpt-4o-mini',
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (jsonMode) {
    params.response_format = { type: 'json_object' };
  }

  const response = await openai.chat.completions.create(params);
  const content = response.choices[0].message.content;
  return jsonMode ? JSON.parse(content) : content;
}

export function isOpenAIAvailable() {
  return !!process.env.OPENAI_API_KEY;
}
