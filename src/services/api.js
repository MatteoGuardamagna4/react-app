const BASE = '/api';

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `API error: ${res.status}`;
    try { const body = await res.json(); if (body.error) msg = body.error; } catch {}
    throw new Error(msg);
  }
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

export async function generatePlots({ stats, plan, userData, completedDays }) {
  return post('/plots/generate', { stats, plan, userData, completedDays });
}

export async function getAlternatives({ exerciseName, dayFocus, userData }) {
  return post('/workout/alternatives', { exerciseName, dayFocus, userData });
}

export async function generateNutrition({ userData, plan, completedDays }) {
  return post('/nutrition/generate', { userData, plan, completedDays });
}

export async function checkHealth() {
  const res = await fetch(`${BASE}/health`);
  return res.json();
}
