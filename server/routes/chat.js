import { Router } from 'express';
import { callGroq } from '../services/groq.js';

const router = Router();

function buildSystemPrompt(userData, clusterInfo, plan) {
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
- Keep responses under 300 words unless the user asks for detail.`;
}

router.post('/', async (req, res) => {
  try {
    const { message, history, userData, clusterInfo, plan } = req.body;

    const systemPrompt = buildSystemPrompt(userData, clusterInfo, plan);
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

    res.json({ reply });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Chat failed' });
  }
});

export default router;
