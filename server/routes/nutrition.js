import { Router } from 'express';
import { callOpenAI } from '../services/openai.js';

const router = Router();

function buildNutritionPrompt(userData, plan, exerciseFeedback, mealFeedback) {
  const planSummary = (plan?.days || []).map(d => {
    const exCount = (d.exercises || []).length;
    return `${d.day}: ${d.focus} (${exCount} exercises)`;
  }).join('\n');

  const expLabels = { 1: 'Beginner', 2: 'Intermediate', 3: 'Expert' };

  const exerciseSection = (exerciseFeedback?.liked?.length || exerciseFeedback?.disliked?.length)
    ? `\n\nUSER EXERCISE PREFERENCES (soft guidance):
- Liked exercises: ${(exerciseFeedback.liked || []).join(', ') || 'none'}
- Disliked exercises: ${(exerciseFeedback.disliked || []).join(', ') || 'none'}
Lean the meal plan (pre/post-workout fueling, portion timing, calorie density, protein distribution) toward the activities the user enjoys. For example, if the user likes high-intensity work, emphasize fast carbs pre-workout and recovery protein post-workout. Reference the liked activities in meal descriptions when relevant. Do not over-fuel for sessions the user tends to skip.`
    : '';

  const mealSection = (mealFeedback?.liked?.length || mealFeedback?.disliked?.length)
    ? `\n\nUSER MEAL PREFERENCES FROM PREVIOUS MEAL PLAN (soft guidance, not hard rules):
- Liked meals: ${(mealFeedback.liked || []).join(', ') || 'none'}
- Disliked meals: ${(mealFeedback.disliked || []).join(', ') || 'none'}
Keep the style and food types of liked meals in the new plan (similar ingredients, cuisine, preparation style, macro profile). Avoid repeating the style, ingredients, or cuisine of disliked meals. You may still propose a similar-sounding meal if the macro targets demand it, but vary the recipe meaningfully.`
    : '';

  const feedbackSection = exerciseSection + mealSection;

  return `You are a professional sports nutritionist. Generate a personalized daily meal plan aligned with the user's workout schedule and goals.

USER PROFILE:
- Age: ${userData.age}, Gender: ${userData.gender}
- Weight: ${userData.weight_kg}kg, Height: ${userData.height_m}m
- BMI: ${(userData.weight_kg / (userData.height_m ** 2)).toFixed(1)}
- Experience: ${expLabels[userData.experience_level] || 'Beginner'}
- Goal: ${userData.goal}
- Workout frequency: ${userData.workout_frequency} days/week
- Daily water intake: ${userData.water_intake}L

WORKOUT PLAN:
${planSummary}${feedbackSection}

Return ONLY valid JSON in this exact format:
{
  "daily_calories": 2200,
  "macros": { "protein_g": 150, "carbs_g": 250, "fat_g": 70 },
  "meals": [
    {
      "name": "Breakfast",
      "time": "7:00 AM",
      "calories": 500,
      "description": "Brief description",
      "items": ["Oatmeal with berries", "2 eggs scrambled", "Black coffee"],
      "pre_post_workout": false
    }
  ],
  "hydration_tip": "Aim for 3L on training days.",
  "supplement_suggestions": ["Whey protein post-workout", "Creatine 5g daily"],
  "meal_prep_tip": "One practical meal prep suggestion"
}

Rules:
- Include 4-5 meals (breakfast, snack, lunch, snack, dinner).
- Mark meals that should be eaten pre/post workout with "pre_post_workout": true.
- Align calorie targets with the user's goal (deficit for weight loss, surplus for muscle gain, maintenance for general fitness).
- Tailor protein intake to body weight and experience level.
- Be specific with portions and food items.`;
}

function mockNutrition(userData) {
  const goalMultipliers = {
    'Lose Weight': 0.85,
    'Build Muscle': 1.15,
    'Improve Cardio': 1.0,
    'General Fitness': 1.0,
  };
  const bmr = userData.gender === 'Male'
    ? 10 * userData.weight_kg + 6.25 * (userData.height_m * 100) - 5 * userData.age + 5
    : 10 * userData.weight_kg + 6.25 * (userData.height_m * 100) - 5 * userData.age - 161;
  const tdee = bmr * 1.55;
  const target = Math.round(tdee * (goalMultipliers[userData.goal] || 1.0));
  const proteinG = Math.round(userData.weight_kg * (userData.goal === 'Build Muscle' ? 2.0 : 1.6));
  const fatG = Math.round(target * 0.25 / 9);
  const carbsG = Math.round((target - proteinG * 4 - fatG * 9) / 4);

  return {
    daily_calories: target,
    macros: { protein_g: proteinG, carbs_g: carbsG, fat_g: fatG },
    meals: [
      {
        name: 'Breakfast',
        time: '7:30 AM',
        calories: Math.round(target * 0.25),
        description: 'High-protein start to fuel your morning.',
        items: ['Oatmeal with banana and honey', '3 scrambled eggs', 'Glass of orange juice'],
        pre_post_workout: false,
      },
      {
        name: 'Morning Snack',
        time: '10:30 AM',
        calories: Math.round(target * 0.1),
        description: 'Light snack to maintain energy.',
        items: ['Greek yogurt with mixed nuts', 'Apple'],
        pre_post_workout: true,
      },
      {
        name: 'Lunch',
        time: '1:00 PM',
        calories: Math.round(target * 0.3),
        description: 'Balanced meal with lean protein and complex carbs.',
        items: ['Grilled chicken breast 200g', 'Brown rice 150g', 'Mixed vegetables', 'Olive oil dressing'],
        pre_post_workout: false,
      },
      {
        name: 'Afternoon Snack',
        time: '4:00 PM',
        calories: Math.round(target * 0.1),
        description: 'Pre-workout fuel or afternoon boost.',
        items: ['Protein shake with banana', 'Handful of almonds'],
        pre_post_workout: true,
      },
      {
        name: 'Dinner',
        time: '7:30 PM',
        calories: Math.round(target * 0.25),
        description: 'Recovery meal with quality protein and vegetables.',
        items: ['Salmon fillet 180g', 'Sweet potato 200g', 'Steamed broccoli', 'Mixed salad'],
        pre_post_workout: false,
      },
    ],
    hydration_tip: `Aim for at least ${Math.max(userData.water_intake, 2.5).toFixed(1)}L of water daily, more on training days.`,
    supplement_suggestions: ['Whey protein post-workout', 'Creatine monohydrate 5g daily', 'Multivitamin with breakfast'],
    meal_prep_tip: 'Prep chicken and rice in bulk on Sundays -- portion into containers for the week ahead.',
  };
}

router.post('/generate', async (req, res) => {
  try {
    const { userData, plan, exerciseFeedback, mealFeedback } = req.body;
    const prompt = buildNutritionPrompt(userData, plan, exerciseFeedback, mealFeedback);

    let nutrition;
    try {
      nutrition = await callOpenAI({ prompt, temperature: 0.7, maxTokens: 1500 });
    } catch (e) {
      console.error('Nutrition OpenAI error:', e.message);
      nutrition = null;
    }

    if (!nutrition || !nutrition.meals) {
      nutrition = mockNutrition(userData);
    }

    res.json(nutrition);
  } catch (error) {
    console.error('Nutrition error:', error);
    res.status(500).json({ error: 'Failed to generate nutrition plan' });
  }
});

export default router;
