const BASE = '/api';

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function generatePlan(userData) {
  return post('/workout/generate', userData);
}

export async function sendChatMessage({ message, history, userData, clusterInfo, plan }) {
  return post('/chat', { message, history, userData, clusterInfo, plan });
}

export async function calculateRewards({ completedDays, plan, userData }) {
  return post('/rewards/calculate', { completedDays, plan, userData });
}

export async function checkHealth() {
  const res = await fetch(`${BASE}/health`);
  return res.json();
}
