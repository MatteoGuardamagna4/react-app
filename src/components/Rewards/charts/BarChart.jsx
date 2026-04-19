import { computeBarChart } from './chartGeometry.js';

export default function BarChart({ stats, plan }) {
  const geo = computeBarChart(stats, plan);

  return (
    <svg viewBox="0 0 380 260" width="100%" xmlns="http://www.w3.org/2000/svg" fontFamily="system-ui,sans-serif">
      <rect width="380" height="260" rx="8" fill="#1a1a2e" />
      <text x="190" y="30" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#e2e8f0">
        Weekly Exercise Count
      </text>

      {geo.gridLines.map((g, i) => (
        <g key={`grid-${i}`}>
          <line x1={geo.chartLeft} y1={g.y} x2="355" y2={g.y} stroke="#e2e8f0" strokeOpacity="0.1" />
          <text x={geo.chartLeft - 8} y={g.y + 4} textAnchor="end" fontSize="10" fill="#e2e8f0" fillOpacity="0.5">
            {g.label}
          </text>
        </g>
      ))}

      <line x1={geo.chartLeft} y1={geo.chartBottom} x2={geo.chartLeft} y2="45" stroke="#e2e8f0" strokeOpacity="0.3" />
      <line x1={geo.chartLeft} y1={geo.chartBottom} x2="355" y2={geo.chartBottom} stroke="#e2e8f0" strokeOpacity="0.3" />

      {geo.bars.map((b, i) => (
        <g key={`bar-${i}`}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="6" fill={b.color} />
          <text x={b.x + b.w / 2} y={geo.chartBottom + 16} textAnchor="middle" fontSize="11" fill="#e2e8f0">
            {b.label}
          </text>
          {b.h > 0 && (
            <text x={b.x + b.w / 2} y={b.y - 5} textAnchor="middle" fontSize="10" fill="#e2e8f0">
              {b.value}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
