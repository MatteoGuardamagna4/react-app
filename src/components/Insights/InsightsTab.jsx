import { useAppState } from '../../context/AppContext.jsx';
import WeeklyBars from './WeeklyBars.jsx';
import MuscleRadar from './MuscleRadar.jsx';
import CalorieCurve from './CalorieCurve.jsx';
import BodyHeatMap from './BodyHeatMap.jsx';

// --- Data derivation helpers ---

function getExerciseCount(day) {
  if (day.focus.toLowerCase().includes('rest')) return 0;
  return day.exercises?.length || 1;
}

const CATEGORY_KEYWORDS = {
  'Upper Body': ['upper body', 'chest', 'shoulder', 'arm', 'back', 'push', 'pull', 'bicep', 'tricep'],
  'Lower Body': ['lower body', 'leg', 'squat', 'glute', 'hamstring', 'calf', 'quad', 'lunge'],
  'Core': ['core', 'ab', 'plank', 'oblique'],
  'Cardio': ['cardio', 'hiit', 'running', 'cycling', 'sprint', 'endurance', 'aerobic'],
  'Flexibility': ['yoga', 'stretch', 'flexibility', 'recovery', 'mobility', 'cool down', 'warm up'],
  'Full Body': ['full body', 'total body', 'compound', 'functional'],
};

function categorizeFocus(focus) {
  const lower = focus.toLowerCase();
  const matched = [];
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      matched.push(category);
    }
  }
  return matched.length > 0 ? matched : [];
}

function computeCategoryScores(days) {
  const scores = {};
  for (const cat of Object.keys(CATEGORY_KEYWORDS)) {
    scores[cat] = 0;
  }

  for (const day of days) {
    if (day.focus.toLowerCase().includes('rest')) continue;
    const cats = categorizeFocus(day.focus);
    if (cats.includes('Full Body')) {
      // Full Body distributes partial credit everywhere
      for (const cat of Object.keys(scores)) {
        scores[cat] += 0.5;
      }
    }
    for (const cat of cats) {
      if (cat !== 'Full Body') {
        scores[cat] += 1;
      }
    }
  }
  return scores;
}

function estimateDailyCalories(day, baseCalories) {
  const count = getExerciseCount(day);
  if (count === 0) return baseCalories * 0.15; // rest day baseline
  // Scale by exercise count, with diminishing returns
  const factor = 0.4 + 0.6 * Math.min(count / 6, 1);
  return Math.round(baseCalories * factor);
}

function computeRegionIntensity(days) {
  const scores = computeCategoryScores(days);
  const maxScore = Math.max(...Object.values(scores), 1);
  const normalized = {};
  for (const [cat, val] of Object.entries(scores)) {
    normalized[cat] = val / maxScore;
  }
  return normalized;
}

export default function InsightsTab() {
  const { workoutPlan, completedDays, clusterInfo, quizCompleted } = useAppState();

  if (!quizCompleted || !workoutPlan) {
    return (
      <div className="tab-content">
        <div className="locked-overlay">
          <div className="locked-icon">LOCKED</div>
          <div className="locked-text">
            Complete the quiz and generate a workout plan to unlock your training insights.
          </div>
        </div>
      </div>
    );
  }

  const days = workoutPlan.days || [];
  const baseCalories = clusterInfo?.avg_calories || 350;
  const dailyCalories = days.map(d => estimateDailyCalories(d, baseCalories));
  const categoryScores = computeCategoryScores(days);
  const regionIntensity = computeRegionIntensity(days);

  const completedCount = Object.values(completedDays).filter(Boolean).length;
  const totalCal = dailyCalories.reduce((s, c) => s + c, 0);

  return (
    <div className="tab-content fade-in">
      <div className="tab-header">Insights</div>
      <p className="tab-subtitle">
        Visual breakdown of your training week
        {completedCount > 0 ? ` -- ${completedCount} days tracked` : ''}
      </p>

      {/* Summary strip */}
      <div className="insights-summary-strip">
        <div className="insights-stat">
          <span className="insights-stat-value">{days.filter(d => !d.focus.toLowerCase().includes('rest')).length}</span>
          <span className="insights-stat-label">Workout days</span>
        </div>
        <div className="insights-stat">
          <span className="insights-stat-value">{Math.round(totalCal)}</span>
          <span className="insights-stat-label">Est. kcal/week</span>
        </div>
        <div className="insights-stat">
          <span className="insights-stat-value">{Object.values(categoryScores).filter(v => v > 0).length}</span>
          <span className="insights-stat-label">Categories hit</span>
        </div>
      </div>

      {/* 1. Weekly Intensity Bars */}
      <div className="insights-chart-card">
        <div className="insights-chart-title">Weekly Intensity</div>
        <div className="insights-chart-desc">Exercise count per day. Green bars are completed sessions.</div>
        <WeeklyBars days={days} completedDays={completedDays} />
      </div>

      {/* 2. Muscle Group Radar */}
      <div className="insights-chart-card">
        <div className="insights-chart-title">Muscle Group Spread</div>
        <div className="insights-chart-desc">How your plan distributes effort across training categories.</div>
        <MuscleRadar scores={categoryScores} />
      </div>

      {/* 3. Calorie Burn Curve */}
      <div className="insights-chart-card">
        <div className="insights-chart-title">Estimated Calorie Burn</div>
        <div className="insights-chart-desc">
          Projected daily expenditure based on cluster average ({Math.round(baseCalories)} kcal).
        </div>
        <CalorieCurve dailyCalories={dailyCalories} days={days} completedDays={completedDays} />
      </div>

      {/* 4. Body Heat Map */}
      <div className="insights-chart-card">
        <div className="insights-chart-title">Body Impact Map</div>
        <div className="insights-chart-desc">Which muscle regions carry the load this week.</div>
        <BodyHeatMap regionIntensity={regionIntensity} />
      </div>
    </div>
  );
}
