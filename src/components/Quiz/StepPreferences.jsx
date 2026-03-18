import { useAppState, useAppDispatch } from '../../context/AppContext.jsx';

const GOALS = ['Lose Weight', 'Build Muscle', 'Improve Cardio', 'General Fitness'];
const WORKOUT_TYPES = ['Cardio', 'Strength', 'HIIT', 'Yoga', 'Mix'];
const EQUIPMENT_OPTIONS = ['Dumbbells', 'Barbell', 'Kettlebell', 'Resistance Bands', 'Pull-up Bar', 'Bench', 'Cable Machine', 'None'];

export default function StepPreferences() {
  const { userData } = useAppState();
  const dispatch = useAppDispatch();

  const update = (field, value) => {
    dispatch({ type: 'UPDATE_USER_DATA', payload: { [field]: value } });
  };

  const toggleEquipment = (item) => {
    const current = userData.equipment || [];
    const next = current.includes(item)
      ? current.filter(e => e !== item)
      : [...current, item];
    update('equipment', next);
  };

  return (
    <div className="fade-in">
      <div className="form-group">
        <label className="form-label">Primary Goal</label>
        <div className="chip-group">
          {GOALS.map(g => (
            <button
              key={g}
              className={`chip ${userData.goal === g ? 'selected' : ''}`}
              onClick={() => update('goal', g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Preferred Workout Type</label>
        <div className="chip-group">
          {WORKOUT_TYPES.map(t => (
            <button
              key={t}
              className={`chip ${userData.preferred_type === t ? 'selected' : ''}`}
              onClick={() => update('preferred_type', t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Available Equipment</label>
        <div className="chip-group">
          {EQUIPMENT_OPTIONS.map(eq => (
            <button
              key={eq}
              className={`chip ${(userData.equipment || []).includes(eq) ? 'selected' : ''}`}
              onClick={() => toggleEquipment(eq)}
            >
              {eq}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Injuries or Limitations?</span>
          <button
            className="chip"
            style={{
              padding: '4px 12px',
              fontSize: 12,
              background: userData.has_injury ? 'var(--accent-warm)' : undefined,
              borderColor: userData.has_injury ? 'var(--accent-warm)' : undefined,
              color: userData.has_injury ? 'white' : undefined,
            }}
            onClick={() => update('has_injury', !userData.has_injury)}
          >
            {userData.has_injury ? 'Yes' : 'No'}
          </button>
        </label>
        {userData.has_injury && (
          <textarea
            className="form-input"
            rows={3}
            placeholder="Describe any injuries, chronic conditions, or movement limitations..."
            value={userData.injury_details}
            onChange={e => update('injury_details', e.target.value)}
            style={{ marginTop: 8, resize: 'vertical' }}
          />
        )}
      </div>
    </div>
  );
}
