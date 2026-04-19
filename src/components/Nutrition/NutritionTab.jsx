import { useState, useEffect } from 'react';
import { useAppState, useAppDispatch } from '../../context/AppContext.jsx';
import { generateNutrition } from '../../services/api.js';
import { summarizeExerciseFeedback, summarizeMealFeedback, mealFeedbackKey } from '../../utils/feedback.js';
import MacroRing from './MacroRing.jsx';

function MealCard({ meal, index, feedback, onFeedback }) {
  const [expanded, setExpanded] = useState(false);
  const fbKey = mealFeedbackKey(meal.name);
  const current = feedback[fbKey];

  return (
    <div
      className={`card meal-card fade-in ${meal.pre_post_workout ? 'workout-meal' : ''}`}
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className="meal-header" onClick={() => setExpanded(!expanded)}>
        <div>
          <div className="meal-name">{meal.name}</div>
          <div className="meal-time">{meal.time}</div>
        </div>
        <div className="meal-calories">{meal.calories} kcal</div>
      </div>
      {meal.pre_post_workout && (
        <div className="meal-badge">Workout fuel</div>
      )}
      {expanded && (
        <div className="meal-details fade-in">
          <div className="meal-description">{meal.description}</div>
          <ul className="meal-items">
            {(meal.items || []).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="meal-footer-row">
        <button className="expand-toggle" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Less' : 'Details'} {expanded ? '[-]' : '[+]'}
        </button>
        <div className="feedback-row compact">
          <button
            className={`feedback-btn small ${current === 'up' ? 'active-up' : ''}`}
            onClick={e => { e.stopPropagation(); onFeedback(fbKey, current === 'up' ? null : 'up'); }}
            aria-label="Like meal"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
          </button>
          <button
            className={`feedback-btn small ${current === 'down' ? 'active-down' : ''}`}
            onClick={e => { e.stopPropagation(); onFeedback(fbKey, current === 'down' ? null : 'down'); }}
            aria-label="Dislike meal"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
              <path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NutritionTab() {
  const { workoutPlan, userData, quizCompleted, nutritionPlan, completedDays, loading, feedback } = useAppState();
  const dispatch = useAppDispatch();
  const [error, setError] = useState(null);
  const isLoading = loading.nutrition;

  if (!quizCompleted || !workoutPlan) {
    return (
      <div className="tab-content">
        <div className="locked-overlay">
          <div className="locked-icon">LOCKED</div>
          <div className="locked-text">
            Complete the quiz and generate a plan first to unlock your personalized meal plan.
          </div>
        </div>
      </div>
    );
  }

  const fetchNutrition = async () => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'nutrition', value: true } });
    setError(null);
    try {
      const exerciseFeedback = summarizeExerciseFeedback(workoutPlan, feedback);
      const mealFeedback = summarizeMealFeedback(nutritionPlan, feedback);
      const result = await generateNutrition({ userData, plan: workoutPlan, completedDays, exerciseFeedback, mealFeedback });
      dispatch({ type: 'SET_NUTRITION', payload: result });
    } catch (e) {
      setError(e.message);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'nutrition', value: false } });
    }
  };

  if (isLoading) {
    return (
      <div className="tab-content">
        <div className="tab-header">Nutrition</div>
        <p className="tab-subtitle">Crafting your personalized meal plan...</p>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab-content">
        <div className="tab-header">Nutrition</div>
        <div className="card" style={{ borderColor: 'var(--accent-warm)' }}>
          <p style={{ color: 'var(--accent-warm)', fontSize: 13 }}>{error}</p>
        </div>
        <button className="btn btn-primary btn-full" onClick={fetchNutrition}>Retry</button>
      </div>
    );
  }

  if (!nutritionPlan) {
    return (
      <div className="tab-content">
        <div className="tab-header">Nutrition</div>
        <p className="tab-subtitle">
          AI-generated meal plan tailored to your {userData.goal?.toLowerCase() || 'fitness'} goal and workout schedule.
        </p>
        <button className="btn btn-primary btn-full" onClick={fetchNutrition}>
          Generate Meal Plan
        </button>
      </div>
    );
  }

  const { daily_calories, macros, meals, hydration_tip, supplement_suggestions, meal_prep_tip } = nutritionPlan;

  return (
    <div className="tab-content fade-in">
      <div className="tab-header">Nutrition</div>
      <p className="tab-subtitle">Your daily meal plan for {userData.goal?.toLowerCase() || 'peak performance'}</p>

      {/* Calorie + Macro ring */}
      <div className="nutrition-overview card">
        <div className="nutrition-overview-inner">
          <MacroRing macros={macros} calories={daily_calories} />
          <div className="macro-legend">
            <div className="macro-row">
              <span className="macro-dot" style={{ background: '#6C63FF' }} />
              <span>Protein</span>
              <span className="macro-val">{macros?.protein_g || 0}g</span>
            </div>
            <div className="macro-row">
              <span className="macro-dot" style={{ background: '#f97316' }} />
              <span>Carbs</span>
              <span className="macro-val">{macros?.carbs_g || 0}g</span>
            </div>
            <div className="macro-row">
              <span className="macro-dot" style={{ background: '#a855f7' }} />
              <span>Fat</span>
              <span className="macro-val">{macros?.fat_g || 0}g</span>
            </div>
          </div>
        </div>
      </div>

      {/* Meals */}
      {(meals || []).map((meal, i) => (
        <MealCard
          key={i}
          meal={meal}
          index={i}
          feedback={feedback}
          onFeedback={(key, value) => dispatch({ type: 'SET_FEEDBACK', payload: { key, value } })}
        />
      ))}

      {/* Hydration */}
      {hydration_tip && (
        <div className="card" style={{ borderLeft: '3px solid #22d3ee' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#22d3ee', marginBottom: 4 }}>
            Hydration
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{hydration_tip}</div>
        </div>
      )}

      {/* Supplements */}
      {supplement_suggestions && supplement_suggestions.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Suggested Supplements</div>
          {supplement_suggestions.map((s, i) => (
            <div key={i} className="tip-item">
              <span className="tip-bullet">{i + 1}.</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* Meal prep tip */}
      {meal_prep_tip && (
        <div className="card card-gradient" style={{ marginTop: 4 }}>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            <strong>Meal Prep Tip:</strong> {meal_prep_tip}
          </div>
        </div>
      )}

      <button
        className="btn btn-secondary btn-full"
        style={{ marginTop: 12 }}
        onClick={fetchNutrition}
      >
        Regenerate Meal Plan
      </button>
    </div>
  );
}
