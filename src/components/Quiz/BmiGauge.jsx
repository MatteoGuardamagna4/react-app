export default function BmiGauge({ bmi }) {
  const clampedBmi = Math.min(Math.max(bmi, 15), 40);
  // Map BMI 15-40 to angle -90 to 90
  const angle = ((clampedBmi - 15) / 25) * 180 - 90;

  let category, color;
  if (bmi < 18.5) { category = 'Underweight'; color = '#3b82f6'; }
  else if (bmi < 25) { category = 'Normal'; color = '#22c55e'; }
  else if (bmi < 30) { category = 'Overweight'; color = '#f97316'; }
  else { category = 'Obese'; color = '#ef4444'; }

  return (
    <div className="bmi-gauge">
      <svg width="200" height="140" viewBox="0 0 200 140">
        {/* Background arc segments */}
        <path d="M 20 100 A 80 80 0 0 1 100 20" fill="none" stroke="#3b82f6" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
        <path d="M 100 20 A 80 80 0 0 1 140 30" fill="none" stroke="#22c55e" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
        <path d="M 140 30 A 80 80 0 0 1 170 60" fill="none" stroke="#f97316" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
        <path d="M 170 60 A 80 80 0 0 1 180 100" fill="none" stroke="#ef4444" strokeWidth="12" strokeLinecap="round" opacity="0.3" />

        {/* Needle */}
        <g transform={`rotate(${angle}, 100, 100)`}>
          <line x1="100" y1="100" x2="100" y2="30" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <circle cx="100" cy="100" r="6" fill={color} />
        </g>

        {/* Value */}
        <text x="100" y="128" textAnchor="middle" fill={color} fontSize="18" fontWeight="700">
          {bmi.toFixed(1)}
        </text>
      </svg>
      <span style={{ fontSize: 13, fontWeight: 600, color }}>{category}</span>
    </div>
  );
}
