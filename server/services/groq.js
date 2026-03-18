import Groq from 'groq-sdk';

let client = null;

function getClient() {
  if (!client && process.env.GROQ_API_KEY) {
    client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return client;
}

export async function callGroq({ prompt, messages, jsonMode = true, temperature = 0.7, maxTokens = 2000 }) {
  const groq = getClient();
  if (!groq) return null;

  const msgs = messages || [{ role: 'user', content: prompt }];
  const params = {
    model: 'llama-3.3-70b-versatile',
    messages: msgs,
    temperature,
    max_tokens: maxTokens,
  };
  if (jsonMode) {
    params.response_format = { type: 'json_object' };
  }

  const response = await groq.chat.completions.create(params);
  const content = response.choices[0].message.content;
  return jsonMode ? JSON.parse(content) : content;
}
