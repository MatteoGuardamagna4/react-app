import { Router } from 'express';
import { chatWithGPT4oMini, isOpenAIAvailable } from '../services/openai.js';

const router = Router();

router.post('/generate', async (req, res) => {
  try {
    if (!isOpenAIAvailable()) {
      return res.status(503).json({ error: 'OpenAI API key not configured' });
    }

    const { userData } = req.body;

    const now = new Date();
    const monthName = now.toLocaleString('en-US', { month: 'long' });
    const year = now.getFullYear();

    const systemPrompt = `You are a fitness trend analyst and content creator. Identify the top 3 fitness trends for ${monthName} ${year} and create actionable content for each.

${userData ? `The user's profile:
- Goal: ${userData.goal || 'General Fitness'}
- Experience: ${userData.experience_level === 1 ? 'Beginner' : userData.experience_level === 2 ? 'Intermediate' : 'Advanced'}
- Preferred workout: ${userData.preferred_type || 'Mix'}
- Equipment: ${(userData.equipment || []).join(', ') || 'Minimal'}
Personalize suggestions to this profile when possible.` : ''}

Respond in JSON with this exact structure:
{
  "month": "${monthName} ${year}",
  "trends": [
    {
      "name": "Trend Name",
      "description": "Brief 2-sentence description of why this trend is popular right now.",
      "icon": "one of: fire, bolt, leaf, heart, star, mountain",
      "exercises": [
        { "name": "Exercise Name", "description": "Brief how-to", "duration": "e.g. 3x12 reps or 20 min" }
      ],
      "dishes": [
        { "name": "Dish Name", "description": "Brief recipe/description", "calories": 350, "macros": "30P/40C/15F" }
      ],
      "experiences": [
        { "name": "Experience Name", "description": "An activity, class, or lifestyle tip related to this trend" }
      ]
    }
  ]
}

Each trend should have exactly 3 exercises, 2 dishes, and 2 experiences.
Make the content specific, practical, and grounded in current fitness culture.`;

    const result = await chatWithGPT4oMini({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `What are the top 3 fitness trends for ${monthName} ${year}? Give me workout exercises, dishes, and experiences for each.` },
      ],
      jsonMode: true,
      temperature: 0.8,
      maxTokens: 2500,
    });

    if (!result) {
      return res.status(500).json({ error: 'Failed to generate trends' });
    }

    res.json(result);
  } catch (err) {
    console.error('Trends error:', err);
    res.status(500).json({ error: 'Failed to generate trends' });
  }
});

export default router;
