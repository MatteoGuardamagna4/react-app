export default function CalorieCurve({ dailyCalories, days, completedDays }) {
  const W = 340;
  const H = 180;
  const PAD_TOP = 20;
  const PAD_BOTTOM = 28;
  const PAD_LEFT = 36;
  const PAD_RIGHT = 16;
  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  const maxCal = Math.max(...dailyCalories, 1);
  const stepX = chartW / Math.max(dailyCalories.length - 1, 1);

  const points = dailyCalories.map((cal, i) => ({
    x: PAD_LEFT + i * stepX,
    y: PAD_TOP + chartH - (cal / maxCal) * chartH,
    cal,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = linePath
    + ` L${points[points.length - 1].x},${PAD_TOP + chartH}`
    + ` L${points[0].x},${PAD_TOP + chartH} Z`;

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(frac => ({
    y: PAD_TOP + chartH * (1 - frac),
    label: Math.round(maxCal * frac),
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="cal-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6C63FF" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="cal-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6C63FF" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>

      {/* Y-axis ticks and gridlines */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PAD_LEFT} y1={t.y} x2={W - PAD_RIGHT} y2={t.y}
            stroke="#2a2a40" strokeWidth="0.5" strokeDasharray="4 3" />
          <text x={PAD_LEFT - 6} y={t.y + 3} textAnchor="end"
            fontSize="8" fill="#6b6b80">
            {t.label}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="url(#cal-area)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="url(#cal-line)" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Data dots */}
      {points.map((p, i) => {
        const isCompleted = completedDays[days[i]?.day] || false;
        const isRest = days[i]?.focus.toLowerCase().includes('rest');
        return (
          <g key={i}>
            {isCompleted && !isRest && (
              <circle cx={p.x} cy={p.y} r="8" fill="#22c55e" opacity="0.15" />
            )}
            <circle cx={p.x} cy={p.y} r="3.5"
              fill={isRest ? '#6b6b80' : isCompleted ? '#22c55e' : '#f97316'}
              stroke="#0f0f1a" strokeWidth="1.5" />
            {/* Calorie label */}
            <text x={p.x} y={p.y - 9} textAnchor="middle"
              fontSize="7.5" fontWeight="600"
              fill={isCompleted ? '#22c55e' : '#a0a0b8'}>
              {Math.round(p.cal)}
            </text>
            {/* Day label */}
            <text x={p.x} y={H - 6} textAnchor="middle"
              fontSize="9" fontWeight="500" fill="#a0a0b8">
              {dayLabels[i] || `D${i + 1}`}
            </text>
          </g>
        );
      })}

      {/* kcal unit */}
      <text x={PAD_LEFT - 6} y={PAD_TOP - 6} textAnchor="end"
        fontSize="7" fill="#6b6b80">kcal</text>
    </svg>
  );
}
