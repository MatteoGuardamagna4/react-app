export function summarizeExerciseFeedback(plan, feedback) {
  if (!plan?.days || !feedback) return null;

  const liked = new Set();
  const disliked = new Set();

  for (const day of plan.days) {
    const exercises = day.exercises || [];
    exercises.forEach((ex, i) => {
      const value = feedback[`ex_${day.day}_${i}`];
      if (value === 'up') liked.add(ex.name);
      else if (value === 'down') disliked.add(ex.name);
    });
  }

  if (!liked.size && !disliked.size) return null;

  return {
    liked: [...liked],
    disliked: [...disliked],
  };
}

export function mealFeedbackKey(mealName) {
  return `meal_${mealName}`;
}

export function summarizeMealFeedback(nutritionPlan, feedback) {
  if (!nutritionPlan?.meals || !feedback) return null;

  const liked = new Set();
  const disliked = new Set();

  for (const meal of nutritionPlan.meals) {
    const value = feedback[mealFeedbackKey(meal.name)];
    if (value === 'up') liked.add(meal.name);
    else if (value === 'down') disliked.add(meal.name);
  }

  if (!liked.size && !disliked.size) return null;

  return {
    liked: [...liked],
    disliked: [...disliked],
  };
}
