import { computeDonutChart } from './chartGeometry.js';

export default function DonutChart({ stats, plan }) {
  const geo = computeDonutChart(stats, plan);
  const legendStartY = 75;

  return (
    <svg viewBox="0 0 380 260" width="100%" xmlns="http://www.w3.org/2000/svg" fontFamily="system-ui,sans-serif">
      <rect width="380" height="260" rx="8" fill="#1a1a2e" />
      <text x="190" y="30" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#e2e8f0">
        Muscle Group Distribution
      </text>

      {geo.slices.map((s, i) => (
        <path key={`slice-${i}`} d={s.path} fill={s.color} />
      ))}

      <text x={geo.cx} y={geo.cy - 4} textAnchor="middle" fontSize="20" fontWeight="bold" fill="#e2e8f0">
        {geo.total}
      </text>
      <text x={geo.cx} y={geo.cy + 14} textAnchor="middle" fontSize="10" fill="#e2e8f0" fillOpacity="0.6">
        total
      </text>

      {geo.slices.map((s, i) => (
        <g key={`leg-${i}`}>
          <rect x="225" y={legendStartY + i * 24} width="12" height="12" rx="2" fill={s.color} />
          <text x="243" y={legendStartY + i * 24 + 10} fontSize="12" fill="#e2e8f0">
            {s.name} {s.pct}%
          </text>
        </g>
      ))}
    </svg>
  );
}
