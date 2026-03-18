import { Router } from 'express';
import { callGroq } from '../services/groq.js';

const router = Router();

function calculateCompletionStats(completedDays, plan) {
  if (!plan || !plan.days) return emptyStats();

  let totalWorkoutDays = 0, totalRestDays = 0, completedWorkoutDays = 0;
  let exercisesDone = 0, currentStreak = 0, maxStreak = 0;

  for (const dayInfo of plan.days) {
    const focus = (dayInfo.focus || '').toLowerCase();
    const isRest = focus.includes('rest');
    if (isRest) { totalRestDays++; continue; }

    totalWorkoutDays++;
    const isCompleted = completedDays[dayInfo.day] || false;
    if (isCompleted) {
      completedWorkoutDays++;
      exercisesDone += (dayInfo.exercises || []).length;
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  const completionRate = totalWorkoutDays > 0 ? (completedWorkoutDays / totalWorkoutDays * 100) : 0;
  const baseXp = completedWorkoutDays * 15;
  const streakBonus = maxStreak * 10;
  const consistencyBonus = completionRate >= 80 ? 25 : (completionRate >= 50 ? 10 : 0);
  const restBonus = totalRestDays * 5;

  return {
    total_days: totalWorkoutDays,
    total_completed: completedWorkoutDays,
    completion_rate: Math.round(completionRate * 10) / 10,
    workout_days_completed: completedWorkoutDays,
    total_workout_days: totalWorkoutDays,
    rest_days_taken: totalRestDays,
    total_rest_days: totalRestDays,
    exercises_done: exercisesDone,
    current_streak: currentStreak,
    max_streak: maxStreak,
    base_xp: baseXp,
    streak_bonus: streakBonus,
    consistency_bonus: consistencyBonus,
    rest_bonus: restBonus,
    total_xp: baseXp + streakBonus + consistencyBonus + restBonus,
  };
}

function emptyStats() {
  return { total_days: 0, total_completed: 0, completion_rate: 0, workout_days_completed: 0, total_workout_days: 0, rest_days_taken: 0, total_rest_days: 0, exercises_done: 0, current_streak: 0, max_streak: 0, base_xp: 0, streak_bonus: 0, consistency_bonus: 0, rest_bonus: 0, total_xp: 0 };
}

function mockRewards(stats) {
  const achievements = [];
  if (stats.total_completed > 0) achievements.push({ name: 'First Steps', icon: 'footprints', description: 'Completed your first workout day!', xp: 20 });
  if (stats.max_streak >= 3) achievements.push({ name: 'On Fire', icon: 'flame', description: `${stats.max_streak}-day streak! Consistency pays off.`, xp: 50 });
  if (stats.completion_rate >= 80) achievements.push({ name: 'Overachiever', icon: 'trophy', description: `${stats.completion_rate}% completion rate this week!`, xp: 75 });
  if (stats.total_rest_days > 0) achievements.push({ name: 'Rest Master', icon: 'moon', description: 'Your plan includes rest days -- recovery is key!', xp: 15 });
  if (stats.exercises_done >= 10) achievements.push({ name: 'Exercise Machine', icon: 'dumbbell', description: `Crushed ${stats.exercises_done} exercises this week!`, xp: 40 });

  const llmXp = achievements.reduce((s, a) => s + a.xp, 0);
  return {
    achievements,
    motivational_message: 'Great work on your fitness journey! Keep pushing forward -- consistency beats intensity every time.',
    performance_rating: stats.completion_rate >= 80 ? 'A' : stats.completion_rate >= 60 ? 'B+' : 'C',
    strengths: ['Dedication to showing up', 'Following the structured plan'],
    improvements: ['Try to maintain longer consecutive streaks'],
    next_week_challenge: 'Complete all planned workout days without missing any!',
    computed_xp: stats.total_xp,
    llm_bonus_xp: llmXp,
    grand_total_xp: stats.total_xp + llmXp,
  };
}

router.post('/calculate', async (req, res) => {
  try {
    const { completedDays, plan, userData } = req.body;
    const stats = calculateCompletionStats(completedDays || {}, plan);

    if (stats.total_completed === 0) {
      return res.json({ stats, rewards: mockRewards(stats) });
    }

    const expLabels = { 1: 'Beginner', 2: 'Intermediate', 3: 'Expert' };
    const planSummary = (plan?.days || []).map(d => {
      const exs = (d.exercises || []).map(e => e.name).join(', ');
      return `${d.day}: ${d.focus} -- ${exs || 'Rest'}`;
    }).join('\n');

    const prompt = `You are a gamification expert and fitness motivator. Analyze the user's workout completion data and generate personalized achievements and feedback.

USER PROFILE:
- Age: ${userData?.age}, Gender: ${userData?.gender}
- Goal: ${userData?.goal}
- Experience: ${expLabels[userData?.experience_level] || 'Beginner'}
- Plan frequency: ${userData?.workout_frequency} days/week

COMPLETION DATA:
- Workout days completed: ${stats.total_completed} out of ${stats.total_days}
- Completion rate: ${stats.completion_rate}%
- Current streak: ${stats.max_streak} consecutive workout days
- Exercises completed: ${stats.exercises_done}
- Rest days in plan: ${stats.rest_days_taken}

WORKOUT PLAN SUMMARY:
${planSummary}

Return ONLY valid JSON:
{
    "achievements": [{ "name": "string", "icon": "single_word_icon_name", "description": "string", "xp": 10 }],
    "motivational_message": "2-3 sentence message",
    "performance_rating": "A+ to F",
    "strengths": ["strength1"],
    "improvements": ["area1"],
    "next_week_challenge": "specific challenge"
}

Rules: Generate 2-5 achievements based on ACTUAL data. XP: easy=10-30, hard=50-100. Be encouraging but honest.`;

    let rewards;
    try {
      rewards = await callGroq({ prompt, temperature: 0.8, maxTokens: 1000 });
    } catch (e) {
      console.error('Rewards Groq error:', e.message);
      rewards = null;
    }

    if (!rewards || !rewards.achievements) {
      rewards = mockRewards(stats);
    } else {
      const llmXp = rewards.achievements.reduce((s, a) => s + (a.xp || 0), 0);
      rewards.computed_xp = stats.total_xp;
      rewards.llm_bonus_xp = llmXp;
      rewards.grand_total_xp = stats.total_xp + llmXp;
    }

    res.json({ stats, rewards });
  } catch (error) {
    console.error('Rewards error:', error);
    res.status(500).json({ error: 'Failed to calculate rewards' });
  }
});

export default router;
