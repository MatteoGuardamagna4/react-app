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

export async function generatePlan(userData, exerciseFeedback) {
  return post('/workout/generate', { ...userData, exerciseFeedback });
}

export async function sendChatMessage({ message, history, userData, clusterInfo, plan, feedbackSummary }) {
  return post('/chat', { message, history, userData, clusterInfo, plan, feedbackSummary });
}

export async function uploadPDF(file, url) {
  const formData = new FormData();
  formData.append('pdf', file);
  if (url) formData.append('url', url);
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!res.ok) {
    let msg = `Upload error: ${res.status}`;
    try { const body = await res.json(); if (body.error) msg = body.error; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function getUploadedFiles() {
  const res = await fetch('/api/upload/files');
  return res.json();
}

export async function generateTrends(userData) {
  return post('/trends/generate', { userData });
}

export async function calculateRewards({ completedDays, plan, userData }) {
  return post('/rewards/calculate', { completedDays, plan, userData });
}

export async function getAlternatives({ exerciseName, dayFocus, userData }) {
  return post('/workout/alternatives', { exerciseName, dayFocus, userData });
}

export async function generateNutrition({ userData, plan, completedDays, exerciseFeedback, mealFeedback }) {
  return post('/nutrition/generate', { userData, plan, completedDays, exerciseFeedback, mealFeedback });
}

export async function queryRAG(question, topK = 5) {
  return post('/rag/query', { question, top_k: topK });
}

export async function checkHealth() {
  const res = await fetch(`${BASE}/health`);
  return res.json();
}
