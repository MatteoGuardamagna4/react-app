import { Router } from 'express';
import { callGroq } from '../services/groq.js';
import { retrieveContext } from '../services/rag.js';

const router = Router();

function buildSystemPrompt(userData, clusterInfo, plan, ragBlock) {
  let planSummary = 'No plan generated yet.';
  if (plan && plan.days) {
    planSummary = plan.days.map(day => {
      const exercises = (day.exercises || []).map(e => e.name).join(', ');
      return `  - ${day.day}: ${day.focus} -- ${exercises || 'Rest'}`;
    }).join('\n');
  }

  const equipment = (userData.equipment || []).join(', ') || 'N/A';
  const expLabels = { 1: 'Beginner', 2: 'Intermediate', 3: 'Expert' };
  const expLabel = expLabels[userData.experience_level] || 'Beginner';

  return `You are a friendly, knowledgeable AI Fitness Coach. You have access to the user's full fitness profile and their personalized workout plan.

USER PROFILE:
- Age: ${userData.age}, Gender: ${userData.gender}
- Weight: ${userData.weight_kg}kg, Height: ${userData.height_m}m
- Experience: ${expLabel}
- Goal: ${userData.goal}
- Preferred workout: ${userData.preferred_type}
- Equipment: ${equipment}
- Workout frequency: ${userData.workout_frequency} days/week
- Session duration: ${userData.session_duration} hours
- Injuries: ${userData.injury_details || 'None'}

CLUSTER DATA (similar users):
- Average calories burned: ${Math.round(clusterInfo?.avg_calories || 400)} kcal
- Average heart rate: ${Math.round(clusterInfo?.avg_bpm || 140)} BPM
- Cluster size: ${clusterInfo?.cluster_size || 0} users

THEIR CURRENT WORKOUT PLAN:
${planSummary}

INSTRUCTIONS:
- Answer questions about their workout plan, suggest modifications, and give nutrition/recovery tips.
- Be concise but helpful. Use the profile data to personalize every response.
- If the user asks something outside fitness, politely redirect.
- When suggesting exercise alternatives, consider their equipment and injuries.
- Keep responses under 300 words unless the user asks for detail.
- The user can rate your responses with thumbs up or down. If feedback is provided below, adjust your style accordingly -- give more of what they liked and less of what they disliked.
${ragBlock || ''}`;
}

function buildRagBlock(chunks, sources) {
  if (!chunks || chunks.length === 0) return '';

  const sourceList = sources
    .map((s, i) => `[${i + 1}] ${s.name}`)
    .join('\n');

  const contextText = chunks
    .map(c => `[${c.sourceIndex}] ${c.text}`)
    .join('\n\n');

  return `
AVAILABLE SOURCES (cite inline using [n]):
${sourceList}

RELEVANT FITNESS KNOWLEDGE (each chunk is prefixed with its source number):
${contextText}

CITATION RULES:
- When a statement is grounded in a source above, append the matching marker, e.g. "Protein helps recovery [1]."
- Use only the numbers listed in AVAILABLE SOURCES. Never invent a source number.
- Do not say "according to my knowledge base" -- weave the information into your own expertise and let the [n] markers do the attribution.`;
}

router.post('/', async (req, res) => {
  try {
    const { message, history, userData, clusterInfo, plan, feedbackSummary } = req.body;

    // RAG retrieval -- get relevant knowledge chunks
    const { chunks, sources } = await retrieveContext(message);
    const ragBlock = buildRagBlock(chunks, sources);

    let systemPrompt = buildSystemPrompt(userData, clusterInfo, plan, ragBlock);
    if (feedbackSummary) {
      systemPrompt += `\n\nUSER FEEDBACK ON PAST RESPONSES:\n${feedbackSummary}`;
    }
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []),
      { role: 'user', content: message },
    ];

    let reply;
    try {
      reply = await callGroq({ messages, jsonMode: false, temperature: 0.8, maxTokens: 800 });
    } catch (e) {
      console.error('Chat Groq error:', e.message);
      reply = null;
    }

    if (!reply) {
      reply = 'The AI coach is currently unavailable. Please check your GROQ_API_KEY configuration.';
    }

    res.json({ reply, sources: sources || [], chunks: chunks || [] });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Chat failed' });
  }
});

export default router;
