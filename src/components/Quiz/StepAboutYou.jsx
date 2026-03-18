import { useAppState, useAppDispatch } from '../../context/AppContext.jsx';
import BmiGauge from './BmiGauge.jsx';

export default function StepAboutYou() {
  const { userData } = useAppState();
  const dispatch = useAppDispatch();

  const update = (field, value) => {
    dispatch({ type: 'UPDATE_USER_DATA', payload: { [field]: value } });
  };

  const bmi = userData.weight_kg / (userData.height_m ** 2);

  return (
    <div className="fade-in">
      <div className="form-group">
        <label className="form-label">Age</label>
        <input
          type="number"
          className="form-input"
          value={userData.age}
          onChange={e => update('age', parseInt(e.target.value) || 18)}
          min={14}
          max={80}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Gender</label>
        <div className="chip-group">
          {['Male', 'Female', 'Other'].map(g => (
            <button
              key={g}
              className={`chip ${userData.gender === g ? 'selected' : ''}`}
              onClick={() => update('gender', g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Weight (kg): {userData.weight_kg}</label>
        <input
          type="range"
          className="form-range"
          value={userData.weight_kg}
          onChange={e => update('weight_kg', parseInt(e.target.value))}
          min={40}
          max={150}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Height (m): {userData.height_m.toFixed(2)}</label>
        <input
          type="range"
          className="form-range"
          value={Math.round(userData.height_m * 100)}
          onChange={e => update('height_m', parseInt(e.target.value) / 100)}
          min={140}
          max={210}
          step={1}
        />
      </div>

      <BmiGauge bmi={bmi} />
    </div>
  );
}
