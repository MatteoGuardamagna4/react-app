import { computeHorizontalBars } from './chartGeometry.js';

export default function ProgressBars({ stats }) {
  const geo = computeHorizontalBars(stats);

  return (
    <svg viewBox="0 0 380 260" width="100%" xmlns="http://www.w3.org/2000/svg" fontFamily="system-ui,sans-serif">
      <rect width="380" height="260" rx="8" fill="#1a1a2e" />
      <text x="190" y="35" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#e2e8f0">
        Your Progress
      </text>

      {geo.rows.map((row, i) => (
        <g key={`row-${i}`}>
          <text x={row.x - 8} y={row.y + row.h / 2 + 4} textAnchor="end" fontSize="12" fill="#e2e8f0">
            {row.label}
          </text>
          <rect x={row.x} y={row.y} width={row.fullW} height={row.h} rx="9" fill="#e2e8f0" fillOpacity="0.08" />
          <rect x={row.x} y={row.y} width={row.w} height={row.h} rx="9" fill={row.color} />
          <text x={row.x + row.w + 8} y={row.y + row.h / 2 + 4} fontSize="11" fill="#e2e8f0">
            {row.display}
          </text>
        </g>
      ))}
    </svg>
  );
}
