import { useState } from 'react';
import { useAppState, useAppDispatch } from '../../context/AppContext.jsx';
import { calculateRewards } from '../../services/api.js';
import AiPlots from './AiPlots.jsx';

const ICON_MAP = {
  footprints: 'FT',
  flame: 'FL',
  trophy: 'TR',
  moon: 'MN',
  dumbbell: 'DB',
  star: 'ST',
  medal: 'MD',
  rocket: 'RK',
  crown: 'CR',
  lightning: 'LT',
};

function getIcon(icon) {
  if (!icon) return 'ST';
  return ICON_MAP[icon.toLowerCase()] || icon.charAt(0).toUpperCase() || 'ST';
}

export default function RewardsTab() {
  const { workoutPlan, completedDays, userData, rewardsData, quizCompleted, loading } = useAppState();
  const dispatch = useAppDispatch();
  const [error, setError] = useState(null);
  const isLoading = loading.rewards;

  if (!quizCompleted || !workoutPlan) {
    return (
      <div className="tab-content">
        <div className="locked-overlay">
          <div className="locked-icon">LOCKED</div>
          <div className="locked-text">
            Complete the quiz and generate a plan first, then mark workout days as done to earn rewards.
          </div>
        </div>
      </div>
    );
  }

  const completedCount = Object.values(completedDays).filter(Boolean).length;

  const fetchRewards = async () => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'rewards', value: true } });
    setError(null);
    try {
      const result = await calculateRewards({ completedDays, plan: workoutPlan, userData });
      dispatch({ type: 'SET_REWARDS', payload: result });
    } catch (e) {
      setError(e.message);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'rewards', value: false } });
    }
  };

  if (!rewardsData && !isLoading) {
    return (
      <div className="tab-content">
        <div className="tab-header">Rewards</div>
        <p className="tab-subtitle">
          {completedCount === 0
            ? 'Mark some workout days as completed in the Plan tab first.'
            : `${completedCount} days completed. Calculate your rewards!`}
        </p>
        <button
          className="btn btn-primary btn-full"
          onClick={fetchRewards}
          disabled={completedCount === 0}
        >
          Calculate Rewards
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="tab-content">
        <div className="tab-header">Rewards</div>
        <p className="tab-subtitle">Analyzing your performance...</p>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab-content">
        <div className="tab-header">Rewards</div>
        <div className="card" style={{ borderColor: 'var(--accent-warm)' }}>
          <p style={{ color: 'var(--accent-warm)', fontSize: 13 }}>{error}</p>
        </div>
        <button className="btn btn-primary btn-full" onClick={fetchRewards}>Retry</button>
      </div>
    );
  }

  const { stats, rewards } = rewardsData;
  const achievements = rewards?.achievements || [];

  return (
    <div className="tab-content fade-in">
      <div className="tab-header">Rewards</div>
      <p className="tab-subtitle">Your weekly performance breakdown</p>

      {/* Grade */}
      <div className="grade-display pulse">
        {rewards?.performance_rating || '--'}
      </div>

      {/* XP summary */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 600 }}>Total XP</span>
          <span style={{ fontWeight: 800, color: 'var(--accent)' }}>
            {rewards?.grand_total_xp || 0} XP
          </span>
        </div>
        <div className="xp-bar-outer">
          <div
            className="xp-bar-inner"
            style={{ width: `${Math.min((rewards?.grand_total_xp || 0) / 3, 100)}%` }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          <span>Base: {rewards?.computed_xp || 0}</span>
          <span>Bonus: +{rewards?.llm_bonus_xp || 0}</span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>
            {stats?.completion_rate || 0}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Completion</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>
            {stats?.max_streak || 0}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Best Streak</div>
        </div>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Achievements</div>
          {achievements.map((ach, i) => (
            <div key={i} className="achievement-card fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="achievement-icon">{getIcon(ach.icon)}</div>
              <div className="achievement-info">
                <div className="achievement-name">{ach.name}</div>
                <div className="achievement-desc">{ach.description}</div>
              </div>
              <div className="achievement-xp">+{ach.xp}</div>
            </div>
          ))}
        </>
      )}

      {/* Motivational message */}
      {rewards?.motivational_message && (
        <div className="card card-gradient" style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>{rewards.motivational_message}</div>
        </div>
      )}

      {/* Strengths / Improvements */}
      {(rewards?.strengths?.length > 0 || rewards?.improvements?.length > 0) && (
        <div className="card" style={{ marginTop: 12 }}>
          {rewards.strengths?.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Strengths: </span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {rewards.strengths.join(', ')}
              </span>
            </div>
          )}
          {rewards.improvements?.length > 0 && (
            <div>
              <span style={{ fontWeight: 600, fontSize: 13 }}>To improve: </span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {rewards.improvements.join(', ')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Next week challenge */}
      {rewards?.next_week_challenge && (
        <div className="card" style={{ marginTop: 12, borderColor: 'var(--accent)' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)', marginBottom: 4 }}>
            Next Week Challenge
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {rewards.next_week_challenge}
          </div>
        </div>
      )}

      {/* AI-Generated Plots */}
      <AiPlots
        stats={stats}
        plan={workoutPlan}
        userData={userData}
        completedDays={completedDays}
      />

      <button
        className="btn btn-secondary btn-full"
        style={{ marginTop: 16 }}
        onClick={fetchRewards}
      >
        Recalculate
      </button>
    </div>
  );
}
