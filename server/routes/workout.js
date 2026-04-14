import { Router } from 'express';
import { callGroq } from '../services/groq.js';
import { preprocessUserInput, assignCluster, getClusterSummary } from '../services/preprocessing.js';

const router = Router();

function buildPrompt(userData, clusterInfo) {
  return `You are a professional fitness coach. Generate a personalized weekly workout plan (Monday to Sunday) in JSON format.

User Profile:
- Age: ${userData.age}, Gender: ${userData.gender}
- Weight: ${userData.weight_kg}kg, Height: ${userData.height_m}m
- Experience: Level ${userData.experience_level} (1=beginner, 3=expert)
- Goal: ${userData.goal}
- Preferred workout type: ${userData.preferred_type}
- Available equipment: ${(userData.equipment || []).join(', ')}
- Workout frequency: ${userData.workout_frequency} days/week
- Session duration: ${userData.session_duration} hours
- Injuries/limitations: ${userData.injury_details || 'None'}

Similar Users Profile (from data analysis):
- Average calories burned per session: ${Math.round(clusterInfo.avg_calories)}
- Average heart rate during workout: ${Math.round(clusterInfo.avg_bpm)} BPM
- Cluster size: ${clusterInfo.cluster_size} similar users

Respond ONLY with valid JSON in this exact format:
{
    "days": [
        {
            "day": "Monday",
            "focus": "Upper Body Strength",
            "description": "Brief description of the session",
            "exercises": [
                {"name": "Bench Press", "details": "3 sets x 10 reps @ moderate weight"},
                {"name": "Dumbbell Rows", "details": "3 sets x 12 reps"}
            ]
        }
    ],
    "tips": [
        "Tip 1 for the user",
        "Tip 2 for the user"
    ]
}

Include rest days based on the user's frequency.
IMPORTANT: Distribute training days evenly throughout the week. Maximize the gap between consecutive training days. Rest days must be explicitly marked with focus containing "Rest" or "Recovery".
Make it specific and actionable.`;
}

function mockPlan(userData) {
  return {
    days: [
      { day: 'Monday', focus: 'Upper Body Strength', description: 'Focus on chest, shoulders, and triceps.', exercises: [
        { name: 'Bench Press', details: '3 sets x 10 reps' },
        { name: 'Overhead Press', details: '3 sets x 8 reps' },
        { name: 'Tricep Dips', details: '3 sets x 12 reps' },
        { name: 'Lateral Raises', details: '3 sets x 15 reps' },
      ]},
      { day: 'Tuesday', focus: 'Rest / Active Recovery', description: 'Light stretching or a 20-min walk.', exercises: [
        { name: 'Foam Rolling', details: '15 minutes full body' },
        { name: 'Light Walking', details: '20-30 minutes' },
      ]},
      { day: 'Wednesday', focus: 'Lower Body', description: 'Focus on quads, hamstrings, and glutes.', exercises: [
        { name: 'Squats', details: '4 sets x 8 reps' },
        { name: 'Romanian Deadlifts', details: '3 sets x 10 reps' },
        { name: 'Leg Press', details: '3 sets x 12 reps' },
        { name: 'Calf Raises', details: '3 sets x 15 reps' },
      ]},
      { day: 'Thursday', focus: 'Rest', description: 'Full rest day. Stay hydrated.', exercises: [] },
      { day: 'Friday', focus: 'Full Body HIIT', description: 'High-intensity circuit training.', exercises: [
        { name: 'Burpees', details: '3 rounds x 45 sec' },
        { name: 'Kettlebell Swings', details: '3 rounds x 45 sec' },
        { name: 'Mountain Climbers', details: '3 rounds x 45 sec' },
        { name: 'Box Jumps', details: '3 rounds x 45 sec' },
      ]},
      { day: 'Saturday', focus: 'Cardio & Core', description: 'Cardiovascular endurance + ab work.', exercises: [
        { name: 'Running / Cycling', details: '30-40 minutes moderate intensity' },
        { name: 'Plank', details: '3 sets x 60 sec' },
        { name: 'Russian Twists', details: '3 sets x 20 reps' },
      ]},
      { day: 'Sunday', focus: 'Rest / Yoga', description: 'Active recovery with flexibility work.', exercises: [
        { name: 'Yoga Flow', details: '30-45 minutes' },
        { name: 'Stretching', details: '15 minutes' },
      ]},
    ],
    tips: [
      `Based on your goal (${userData.goal || 'General Fitness'}), focus on progressive overload each week.`,
      'Aim for at least 2L of water on training days.',
      'Get 7-9 hours of sleep for optimal recovery.',
      `With ${userData.workout_frequency || 3} training days/week, space out intense sessions.`,
    ],
  };
}

router.post('/generate', async (req, res) => {
  try {
    const userData = req.body;
    const features = preprocessUserInput(userData);
    const cluster = assignCluster(features);
    const clusterInfo = getClusterSummary(cluster);

    const prompt = buildPrompt(userData, clusterInfo);
    let plan;
    try {
      plan = await callGroq({ prompt });
    } catch (e) {
      console.error('Groq error, using mock:', e.message);
      plan = null;
    }

    if (!plan || !plan.days) {
      plan = mockPlan(userData);
    }

    res.json({ plan, cluster, clusterInfo });
  } catch (error) {
    console.error('Plan generation error:', error);
    res.status(500).json({ error: 'Failed to generate plan' });
  }
});

router.post('/alternatives', async (req, res) => {
  try {
    const { exerciseName, dayFocus, userData } = req.body;
    const equipment = (userData?.equipment || []).join(', ') || 'None';
    const injuries = userData?.injury_details || 'None';

    const prompt = `You are a fitness coach. Suggest 3 alternative exercises to replace "${exerciseName}" for a "${dayFocus}" workout day.

User context:
- Available equipment: ${equipment}
- Injuries/limitations: ${injuries}
- Experience level: ${userData?.experience_level || 1} (1=beginner, 3=expert)
- Goal: ${userData?.goal || 'General Fitness'}

Return ONLY valid JSON:
{
  "alternatives": [
    {"name": "Exercise Name", "details": "3 sets x 10 reps", "reason": "Brief reason why this is a good swap"}
  ]
}

Rules: Each alternative must target the same muscle group. Consider equipment and injuries. Be specific with sets/reps.`;

    let result;
    try {
      result = await callGroq({ prompt, temperature: 0.7, maxTokens: 600 });
    } catch (e) {
      console.error('Alternatives Groq error:', e.message);
      result = null;
    }

    if (!result || !result.alternatives) {
      result = {
        alternatives: [
          { name: 'Bodyweight variation', details: '3 sets x 12 reps', reason: 'No equipment needed' },
          { name: 'Resistance band variation', details: '3 sets x 15 reps', reason: 'Lower impact on joints' },
          { name: 'Dumbbell variation', details: '3 sets x 10 reps', reason: 'Adjustable resistance' },
        ],
      };
    }

    res.json(result);
  } catch (error) {
    console.error('Alternatives error:', error);
    res.status(500).json({ error: 'Failed to get alternatives' });
  }
});

export default router;
