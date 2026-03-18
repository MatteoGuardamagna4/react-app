export default function WeeklyBars({ days, completedDays }) {
  const W = 340;
  const H = 180;
  const PAD_TOP = 20;
  const PAD_BOTTOM = 28;
  const PAD_X = 20;
  const barGap = 10;
  const chartH = H - PAD_TOP - PAD_BOTTOM;
  const barW = (W - PAD_X * 2 - barGap * 6) / 7;

  const counts = days.map(d => {
    const isRest = d.focus.toLowerCase().includes('rest');
    return isRest ? 0.5 : (d.exercises?.length || 1);
  });
  const maxCount = Math.max(...counts, 1);

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="bar-glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6C63FF" />
        </linearGradient>
        <linearGradient id="bar-completed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="50%" stopColor="#6C63FF" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="bar-dim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2a40" />
          <stop offset="100%" stopColor="#1a1a2e" />
        </linearGradient>
        <filter id="bar-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#6C63FF" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Gridlines */}
      {[0.25, 0.5, 0.75, 1].map(frac => {
        const y = PAD_TOP + chartH * (1 - frac);
        return (
          <line key={frac} x1={PAD_X} y1={y} x2={W - PAD_X} y2={y}
            stroke="#2a2a40" strokeWidth="0.5" strokeDasharray="4 3" />
        );
      })}

      {days.map((day, i) => {
        const isRest = day.focus.toLowerCase().includes('rest');
        const isCompleted = completedDays[day.day] || false;
        const count = counts[i];
        const barH = Math.max((count / maxCount) * chartH, 4);
        const x = PAD_X + i * (barW + barGap);
        const y = PAD_TOP + chartH - barH;
        const label = dayLabels[i] || day.day?.slice(0, 3) || `D${i + 1}`;
        const fill = isRest ? 'url(#bar-dim)' : isCompleted ? 'url(#bar-completed)' : 'url(#bar-glow)';
        const filterAttr = isCompleted && !isRest ? 'url(#bar-shadow)' : undefined;

        return (
          <g key={i}>
            <rect
              x={x} y={y} width={barW} height={barH}
              rx={4} fill={fill} filter={filterAttr}
              opacity={isRest ? 0.4 : isCompleted ? 1 : 0.65}
            />
            {/* Exercise count on top of bar */}
            {!isRest && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle"
                fontSize="9" fontWeight="700"
                fill={isCompleted ? '#22c55e' : '#a0a0b8'}>
                {Math.round(count)}
              </text>
            )}
            {isRest && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle"
                fontSize="8" fill="#6b6b80">
                rest
              </text>
            )}
            {/* Day label */}
            <text x={x + barW / 2} y={H - 6} textAnchor="middle"
              fontSize="9" fontWeight="500"
              fill={isCompleted ? '#22c55e' : '#a0a0b8'}>
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
