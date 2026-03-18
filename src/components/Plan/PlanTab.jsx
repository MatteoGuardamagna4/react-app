import { useState, useEffect } from 'react';
import { useAppState, useAppDispatch } from '../../context/AppContext.jsx';
import { generatePlan } from '../../services/api.js';

function DayCard({ day, isCompleted, isRest, onToggle }) {
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
            <div key={i} className="exercise-item">
              <div className="exercise-info">
                <span className="exercise-name">{ex.name}</span>
                <span className="exercise-details">{ex.details}</span>
              </div>
              <a
                className="exercise-yt-link"
                href={`https://www.youtube.com/results?search_query=how+to+${encodeURIComponent(ex.name)}+exercise+form`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Watch tutorial
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlanTab() {
  const { workoutPlan, completedDays, userData, loading } = useAppState();
  const dispatch = useAppDispatch();
  const [error, setError] = useState(null);

  const isLoading = loading.plan;

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
