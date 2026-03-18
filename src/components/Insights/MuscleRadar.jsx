const CATEGORIES = ['Upper Body', 'Lower Body', 'Core', 'Cardio', 'Flexibility', 'Full Body'];

export default function MuscleRadar({ scores }) {
  const CX = 160;
  const CY = 130;
  const R = 95;
  const RINGS = 4;
  const N = CATEGORIES.length;
  const angleStep = (Math.PI * 2) / N;
  const startAngle = -Math.PI / 2;

  function polar(angle, radius) {
    return {
      x: CX + Math.cos(angle) * radius,
      y: CY + Math.sin(angle) * radius,
    };
  }

  function ringPoints(radius) {
    return Array.from({ length: N }, (_, i) => {
      const p = polar(startAngle + i * angleStep, radius);
      return `${p.x},${p.y}`;
    }).join(' ');
  }

  const maxScore = Math.max(...Object.values(scores), 1);

  const dataPoints = CATEGORIES.map((cat, i) => {
    const val = (scores[cat] || 0) / maxScore;
    return polar(startAngle + i * angleStep, val * R);
  });
  const dataPath = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox="0 0 320 280" width="100%" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="radar-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6C63FF" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="radar-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6C63FF" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>

      {/* Concentric rings */}
      {Array.from({ length: RINGS }, (_, r) => {
        const radius = R * ((r + 1) / RINGS);
        return (
          <polygon key={r} points={ringPoints(radius)}
            fill="none" stroke="#2a2a40" strokeWidth="0.7" />
        );
      })}

      {/* Axis lines */}
      {CATEGORIES.map((_, i) => {
        const end = polar(startAngle + i * angleStep, R);
        return (
          <line key={i} x1={CX} y1={CY} x2={end.x} y2={end.y}
            stroke="#2a2a40" strokeWidth="0.5" />
        );
      })}

      {/* Data polygon */}
      <polygon points={dataPath}
        fill="url(#radar-fill)" stroke="url(#radar-stroke)" strokeWidth="2" />

      {/* Data dots */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5"
          fill="#6C63FF" stroke="#f1f1f1" strokeWidth="1.2" />
      ))}

      {/* Labels */}
      {CATEGORIES.map((cat, i) => {
        const labelR = R + 18;
        const angle = startAngle + i * angleStep;
        const p = polar(angle, labelR);
        const anchor = Math.abs(Math.cos(angle)) < 0.01 ? 'middle'
          : Math.cos(angle) > 0 ? 'start' : 'end';
        const val = scores[cat] || 0;
        return (
          <g key={i}>
            <text x={p.x} y={p.y} textAnchor={anchor}
              dominantBaseline="central"
              fontSize="9" fontWeight="600" fill="#a0a0b8">
              {cat}
            </text>
            <text x={p.x} y={p.y + 12} textAnchor={anchor}
              fontSize="8" fill="#6b6b80">
              {val > 0 ? `${val} day${val !== 1 ? 's' : ''}` : '--'}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
