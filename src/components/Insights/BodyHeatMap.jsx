// Simplified front-facing body silhouette with heat-mapped regions.
// Each path represents a body zone, colored by workout intensity.

const BODY_REGIONS = {
  head: {
    path: 'M160,28 C148,28 140,38 140,50 C140,62 148,72 160,72 C172,72 180,62 180,50 C180,38 172,28 160,28 Z',
    maps: [],
  },
  neck: {
    path: 'M152,72 L152,82 L168,82 L168,72 Z',
    maps: [],
  },
  chest: {
    path: 'M126,86 L194,86 L198,130 L122,130 Z',
    maps: ['Upper Body'],
  },
  core: {
    path: 'M128,130 L192,130 L188,180 L132,180 Z',
    maps: ['Core'],
  },
  leftShoulder: {
    path: 'M126,86 L104,92 L108,108 L122,104 Z',
    maps: ['Upper Body'],
  },
  rightShoulder: {
    path: 'M194,86 L216,92 L212,108 L198,104 Z',
    maps: ['Upper Body'],
  },
  leftUpperArm: {
    path: 'M104,92 L92,96 L88,138 L108,134 Z',
    maps: ['Upper Body'],
  },
  rightUpperArm: {
    path: 'M216,92 L228,96 L232,138 L212,134 Z',
    maps: ['Upper Body'],
  },
  leftForearm: {
    path: 'M88,138 L80,142 L76,186 L92,182 Z',
    maps: ['Upper Body'],
  },
  rightForearm: {
    path: 'M232,138 L240,142 L244,186 L228,182 Z',
    maps: ['Upper Body'],
  },
  leftHand: {
    path: 'M76,186 C70,194 68,202 72,206 C76,210 84,206 88,198 L92,182 Z',
    maps: [],
  },
  rightHand: {
    path: 'M244,186 C250,194 252,202 248,206 C244,210 236,206 232,198 L228,182 Z',
    maps: [],
  },
  hips: {
    path: 'M132,180 L188,180 L194,200 L126,200 Z',
    maps: ['Lower Body', 'Core'],
  },
  leftThigh: {
    path: 'M126,200 L156,200 L150,280 L120,280 Z',
    maps: ['Lower Body'],
  },
  rightThigh: {
    path: 'M164,200 L194,200 L200,280 L170,280 Z',
    maps: ['Lower Body'],
  },
  leftCalf: {
    path: 'M120,280 L150,280 L146,356 L124,356 Z',
    maps: ['Lower Body'],
  },
  rightCalf: {
    path: 'M170,280 L200,280 L196,356 L174,356 Z',
    maps: ['Lower Body'],
  },
  leftFoot: {
    path: 'M124,356 L146,356 L148,370 L118,370 Z',
    maps: [],
  },
  rightFoot: {
    path: 'M174,356 L196,356 L202,370 L172,370 Z',
    maps: [],
  },
};

function intensityColor(value) {
  // value 0..1 -> from dark base to hot gradient
  if (value <= 0) return '#1a1a2e';
  if (value < 0.2) return '#2a2244';
  if (value < 0.4) return '#4a3070';
  if (value < 0.6) return '#6C63FF';
  if (value < 0.8) return '#a855f7';
  return '#f97316';
}

export default function BodyHeatMap({ regionIntensity }) {
  // regionIntensity: { 'Upper Body': 0..1, 'Lower Body': 0..1, 'Core': 0..1, 'Cardio': 0..1, 'Flexibility': 0..1 }
  const cardioBoost = (regionIntensity['Cardio'] || 0) * 0.15;
  const flexBoost = (regionIntensity['Flexibility'] || 0) * 0.1;

  return (
    <svg viewBox="0 0 320 400" width="100%" style={{ display: 'block' }}>
      <defs>
        <filter id="body-glow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
        </filter>
        <radialGradient id="heart-pulse" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Glow layer underneath */}
      <g filter="url(#body-glow)" opacity="0.4">
        {Object.entries(BODY_REGIONS).map(([name, region]) => {
          const regionMax = region.maps.reduce((max, cat) => {
            return Math.max(max, regionIntensity[cat] || 0);
          }, 0);
          const total = Math.min(regionMax + cardioBoost + flexBoost, 1);
          if (total < 0.2) return null;
          return <path key={`glow-${name}`} d={region.path} fill={intensityColor(total)} />;
        })}
      </g>

      {/* Main body */}
      {Object.entries(BODY_REGIONS).map(([name, region]) => {
        const regionMax = region.maps.reduce((max, cat) => {
          return Math.max(max, regionIntensity[cat] || 0);
        }, 0);
        const total = Math.min(regionMax + cardioBoost + flexBoost, 1);
        return (
          <path key={name} d={region.path}
            fill={intensityColor(total)}
            stroke="#2a2a40" strokeWidth="0.7"
            opacity={0.9}
          />
        );
      })}

      {/* Heart icon for cardio */}
      {(regionIntensity['Cardio'] || 0) > 0 && (
        <g>
          <circle cx="160" cy="105" r="14" fill="url(#heart-pulse)" />
          <text x="160" y="109" textAnchor="middle" fontSize="14" fill="#ef4444">
            &#9829;
          </text>
        </g>
      )}

      {/* Legend */}
      <g>
        <text x="10" y="395" fontSize="8" fill="#6b6b80">Low</text>
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((v, i) => (
          <rect key={i} x={30 + i * 22} y={387} width={20} height={8}
            rx="2" fill={intensityColor(v)} />
        ))}
        <text x={30 + 6 * 22 + 4} y="395" fontSize="8" fill="#6b6b80">High</text>
      </g>
    </svg>
  );
}
