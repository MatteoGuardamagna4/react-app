import { useAppState, useAppDispatch } from '../../context/AppContext.jsx';

const EXP_LEVELS = [
  { value: 1, label: 'Beginner', desc: 'New to fitness or returning after a long break' },
  { value: 2, label: 'Intermediate', desc: 'Consistent training for 6+ months' },
  { value: 3, label: 'Expert', desc: '2+ years of structured training' },
];

export default function StepFitnessLevel() {
  const { userData } = useAppState();
  const dispatch = useAppDispatch();

  const update = (field, value) => {
    dispatch({ type: 'UPDATE_USER_DATA', payload: { [field]: value } });
  };

  return (
    <div className="fade-in">
      <div className="form-group">
        <label className="form-label">Experience Level</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {EXP_LEVELS.map(lvl => (
            <div
              key={lvl.value}
              className={`card ${userData.experience_level === lvl.value ? '' : ''}`}
              style={{
                cursor: 'pointer',
                borderColor: userData.experience_level === lvl.value ? 'var(--primary)' : undefined,
                background: userData.experience_level === lvl.value ? 'rgba(108, 99, 255, 0.1)' : undefined,
              }}
              onClick={() => update('experience_level', lvl.value)}
            >
              <div style={{ fontWeight: 600, fontSize: 14 }}>{lvl.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{lvl.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          Workout Frequency: {userData.workout_frequency} days/week
        </label>
        <input
          type="range"
          className="form-range"
          value={userData.workout_frequency}
          onChange={e => update('workout_frequency', parseInt(e.target.value))}
          min={1}
          max={7}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
          <span>1 day</span><span>7 days</span>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          Session Duration: {userData.session_duration}h
        </label>
        <input
          type="range"
          className="form-range"
          value={userData.session_duration * 10}
          onChange={e => update('session_duration', parseInt(e.target.value) / 10)}
          min={3}
          max={25}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
          <span>0.3h</span><span>2.5h</span>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          Daily Water Intake: {userData.water_intake}L
        </label>
        <input
          type="range"
          className="form-range"
          value={userData.water_intake * 10}
          onChange={e => update('water_intake', parseInt(e.target.value) / 10)}
          min={5}
          max={50}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
          <span>0.5L</span><span>5L</span>
        </div>
      </div>
    </div>
  );
}
