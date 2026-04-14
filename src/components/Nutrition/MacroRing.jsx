export default function MacroRing({ macros, calories }) {
  const protein = macros?.protein_g || 0;
  const carbs = macros?.carbs_g || 0;
  const fat = macros?.fat_g || 0;
  const total = protein + carbs + fat || 1;

  const CX = 70, CY = 70, R = 54, STROKE = 12;
  const circumference = 2 * Math.PI * R;

  const proteinFrac = protein / total;
  const carbsFrac = carbs / total;
  const fatFrac = fat / total;

  const proteinLen = proteinFrac * circumference;
  const carbsLen = carbsFrac * circumference;
  const fatLen = fatFrac * circumference;

  const proteinOffset = 0;
  const carbsOffset = -(proteinLen);
  const fatOffset = -(proteinLen + carbsLen);

  return (
    <svg viewBox="0 0 140 140" width="120" height="120" style={{ display: 'block' }}>
      {/* Background ring */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#2a2a40" strokeWidth={STROKE} />

      {/* Fat arc */}
      <circle cx={CX} cy={CY} r={R} fill="none"
        stroke="#a855f7" strokeWidth={STROKE}
        strokeDasharray={`${fatLen} ${circumference - fatLen}`}
        strokeDashoffset={fatOffset}
        transform={`rotate(-90 ${CX} ${CY})`}
        strokeLinecap="round"
      />

      {/* Carbs arc */}
      <circle cx={CX} cy={CY} r={R} fill="none"
        stroke="#f97316" strokeWidth={STROKE}
        strokeDasharray={`${carbsLen} ${circumference - carbsLen}`}
        strokeDashoffset={carbsOffset}
        transform={`rotate(-90 ${CX} ${CY})`}
        strokeLinecap="round"
      />

      {/* Protein arc */}
      <circle cx={CX} cy={CY} r={R} fill="none"
        stroke="#6C63FF" strokeWidth={STROKE}
        strokeDasharray={`${proteinLen} ${circumference - proteinLen}`}
        strokeDashoffset={proteinOffset}
        transform={`rotate(-90 ${CX} ${CY})`}
        strokeLinecap="round"
      />

      {/* Center text */}
      <text x={CX} y={CY - 6} textAnchor="middle" fontSize="18" fontWeight="800" fill="#f1f1f1">
        {calories || 0}
      </text>
      <text x={CX} y={CY + 10} textAnchor="middle" fontSize="9" fill="#a0a0b8">
        kcal/day
      </text>
    </svg>
  );
}
