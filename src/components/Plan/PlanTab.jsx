import { useState, useEffect } from 'react';
import { useAppState, useAppDispatch } from '../../context/AppContext.jsx';
import { generatePlan, getAlternatives } from '../../services/api.js';

function ExerciseItem({ exercise, dayName, exerciseIndex, feedback, onFeedback, onSwap }) {
  const [alts, setAlts] = useState(null);
  const [loadingAlts, setLoadingAlts] = useState(false);
  const feedbackKey = `ex_${dayName}_${exerciseIndex}`;
  const current = feedback[feedbackKey];

  const handleSwap = async () => {
    if (loadingAlts) return;
    setLoadingAlts(true);
    try {
      const result = await onSwap(exercise.name, dayName);
      setAlts(result);
    } catch {
      setAlts(null);
    } finally {
      setLoadingAlts(false);
    }
  };

  return (
    <div className="exercise-item">
      <div className="exercise-info">
        <span className="exercise-name">{exercise.name}</span>
        <span className="exercise-details">{exercise.details}</span>
      </div>
      <div className="exercise-actions-row">
        <a
          className="exercise-yt-link"
          href={`https://www.youtube.com/results?search_query=how+to+${encodeURIComponent(exercise.name)}+exercise+form`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          Watch
        </a>
        <button className="exercise-swap-btn" onClick={handleSwap} disabled={loadingAlts}>
          {loadingAlts ? '...' : 'Swap'}
        </button>
        <div className="feedback-row compact">
          <button
            className={`feedback-btn small ${current === 'up' ? 'active-up' : ''}`}
            onClick={() => onFeedback(feedbackKey, current === 'up' ? null : 'up')}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
          </button>
          <button
            className={`feedback-btn small ${current === 'down' ? 'active-down' : ''}`}
            onClick={() => onFeedback(feedbackKey, current === 'down' ? null : 'down')}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
              <path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/>
            </svg>
          </button>
        </div>
      </div>
      {alts && alts.length > 0 && (
        <div className="alternatives-list fade-in">
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary-light)', marginBottom: 4 }}>
            Alternatives:
          </div>
          {alts.map((alt, i) => (
            <div key={i} className="alternative-item">
              <span style={{ fontWeight: 600, fontSize: 12 }}>{alt.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{alt.details}</span>
              {alt.reason && <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontStyle: 'italic' }}>{alt.reason}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DayCard({ day, isCompleted, isRest, onToggle, feedback, onFeedback, onSwap }) {
  const [expanded, setExpanded] = useState(false);
  const exercises = day.exercises || [];

  return (
    <div className={`card day-card ${isRest ? 'rest' : ''} ${isCompleted ? 'completed' : ''}`}>
      <div className="day-header" onClick={() => !isRest && exercises.length > 0 && setExpanded(!expanded)}>
        <div>
          <div className="day-name">{day.day}</div>
          <div className="day-focus">{day.focus}</div>
        </div>
        {!isRest && (
          <div
            className={`custom-checkbox ${isCompleted ? 'checked' : ''}`}
            onClick={e => { e.stopPropagation(); onToggle(); }}
          >
            {isCompleted && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        )}
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
        {day.description}
      </div>

      {exercises.length > 0 && (
        <button className="expand-toggle" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Hide' : 'Show'} {exercises.length} exercises {expanded ? '[-]' : '[+]'}
        </button>
      )}

      {expanded && (
        <div className="exercise-list fade-in" style={{ marginTop: 8 }}>
          {exercises.map((ex, i) => (
            <ExerciseItem
              key={i}
              exercise={ex}
              dayName={day.day}
              exerciseIndex={i}
              feedback={feedback}
              onFeedback={onFeedback}
              onSwap={onSwap}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlanTab() {
  const { workoutPlan, completedDays, userData, loading, feedback } = useAppState();
  const dispatch = useAppDispatch();
  const [error, setError] = useState(null);

  const isLoading = loading.plan;

  const handleFeedback = (key, value) => {
    dispatch({ type: 'SET_FEEDBACK', payload: { key, value } });
  };

  const handleSwap = async (exerciseName, dayName) => {
    const result = await getAlternatives({
      exerciseName,
      dayFocus: dayName,
      userData,
    });
    return result.alternatives || [];
  };

  const fetchPlan = async () => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'plan', value: true } });
    setError(null);
    try {
      const result = await generatePlan(userData);
      dispatch({ type: 'SET_PLAN', payload: result });
    } catch (e) {
      setError(e.message);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'plan', value: false } });
    }
  };

  useEffect(() => {
    if (!workoutPlan && !isLoading) {
      fetchPlan();
    }
  }, []);

  if (isLoading) {
    return (
      <div className="tab-content">
        <div className="tab-header">Your Plan</div>
        <p className="tab-subtitle">Generating your personalized workout plan...</p>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab-content">
        <div className="tab-header">Your Plan</div>
        <div className="card" style={{ borderColor: 'var(--accent-warm)' }}>
          <p style={{ color: 'var(--accent-warm)', fontSize: 13 }}>Failed to generate plan: {error}</p>
        </div>
        <button className="btn btn-primary btn-full" onClick={fetchPlan}>Retry</button>
      </div>
    );
  }

  if (!workoutPlan) {
    return (
      <div className="tab-content">
        <div className="tab-header">Your Plan</div>
        <p className="tab-subtitle">No plan yet.</p>
        <button className="btn btn-primary btn-full" onClick={fetchPlan}>Generate Plan</button>
      </div>
    );
  }

  const days = workoutPlan.days || [];
  const tips = workoutPlan.tips || [];
  const completedCount = Object.values(completedDays).filter(Boolean).length;
  const workoutDayCount = days.filter(d => !d.focus.toLowerCase().includes('rest')).length;

  return (
    <div className="tab-content fade-in">
      <div className="tab-header">Your Plan</div>
      <p className="tab-subtitle">
        {completedCount}/{workoutDayCount} workout days completed
      </p>

      <div className="xp-bar-outer" style={{ marginBottom: 16 }}>
        <div
          className="xp-bar-inner"
          style={{ width: `${workoutDayCount > 0 ? (completedCount / workoutDayCount * 100) : 0}%` }}
        />
      </div>

      {days.map(day => {
        const isRest = day.focus.toLowerCase().includes('rest');
        return (
          <DayCard
            key={day.day}
            day={day}
            isRest={isRest}
            isCompleted={completedDays[day.day] || false}
            onToggle={() => dispatch({ type: 'TOGGLE_DAY', payload: day.day })}
            feedback={feedback}
            onFeedback={handleFeedback}
            onSwap={handleSwap}
          />
        );
      })}

      {tips.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Tips</div>
          {tips.map((tip, i) => (
            <div key={i} className="tip-item">
              <span className="tip-bullet">{i + 1}.</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}

      <button
        className="btn btn-secondary btn-full"
        style={{ marginTop: 8 }}
        onClick={fetchPlan}
      >
        Regenerate Plan
      </button>
    </div>
  );
}
