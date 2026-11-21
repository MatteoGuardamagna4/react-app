export const CHART_COLORS = ['#6C63FF', '#a855f7', '#f97316', '#22d3ee', '#4ade80', '#f472b6', '#facc15'];

function r2(n) { return Math.round(n * 100) / 100; }

export function computeBarChart(stats, plan) {
  const days = (plan?.days || []).map(d => d.day?.slice(0, 3) || '?');
  const counts = (plan?.days || []).map(d => (d.exercises || []).length);
  const completed = (plan?.days || []).map(d => (stats?.completedDays?.[d.day] ? true : false));
  const maxVal = Math.max(...counts, 1);

  const chartLeft = 55, chartBottom = 220, chartTop = 50;
  const barAreaWidth = 300;
  const barWidth = 28;
  const gap = (barAreaWidth - barWidth * days.length) / (days.length + 1);
  const scaleH = chartBottom - chartTop;

  const bars = days.map((label, i) => {
    const x = chartLeft + gap + i * (barWidth + gap);
    const h = Math.round((counts[i] / maxVal) * scaleH);
    const y = chartBottom - h;
    const color = completed[i] ? CHART_COLORS[i % CHART_COLORS.length] : '#444466';
    return { label, x: Math.round(x), y, w: barWidth, h, value: counts[i], color };
  });

  const gridLines = [];
  const step = maxVal <= 4 ? 1 : Math.ceil(maxVal / 4);
  for (let v = 0; v <= maxVal; v += step) {
    const y = chartBottom - Math.round((v / maxVal) * scaleH);
    gridLines.push({ y, label: v });
  }

  return { bars, gridLines, chartLeft, chartBottom, maxVal };
}

export function computeDonutChart(stats, plan) {
  const muscleTally = {};
  for (const d of (plan?.days || [])) {
    if (stats?.completedDays?.[d.day]) {
      for (const ex of (d.exercises || [])) {
        const muscle = (ex.muscle_group || ex.name || 'General').split(/[,/]/)[0].trim();
        muscleTally[muscle] = (muscleTally[muscle] || 0) + 1;
      }
    }
  }

  const entries = Object.entries(muscleTally);
  if (entries.length === 0) entries.push(['None', 1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  const cx = 120, cy = 140, outerR = 75, innerR = 45;
  let angle = -Math.PI / 2;
  const slices = entries.map(([name, count], i) => {
    const sweep = (count / total) * 2 * Math.PI;
    const startAngle = angle;
    const endAngle = angle + sweep;
    const large = sweep > Math.PI ? 1 : 0;

    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);
    const x3 = cx + innerR * Math.cos(endAngle);
    const y3 = cy + innerR * Math.sin(endAngle);
    const x4 = cx + innerR * Math.cos(startAngle);
    const y4 = cy + innerR * Math.sin(startAngle);

    const path = `M ${r2(x1)} ${r2(y1)} A ${outerR} ${outerR} 0 ${large} 1 ${r2(x2)} ${r2(y2)} L ${r2(x3)} ${r2(y3)} A ${innerR} ${innerR} 0 ${large} 0 ${r2(x4)} ${r2(y4)} Z`;

    angle = endAngle;
    return { name, pct: Math.round((count / total) * 100), path, color: CHART_COLORS[i % CHART_COLORS.length] };
  });

  return { slices, cx, cy, total };
}

export function computeHorizontalBars(stats) {
  const metrics = [
    { label: 'Completion', value: stats?.completion_rate || 0, max: 100, display: `${Math.round(stats?.completion_rate || 0)}%` },
    { label: 'Best Streak', value: stats?.max_streak || 0, max: 7, display: `${stats?.max_streak || 0} days` },
    { label: 'Exercises Done', value: stats?.exercises_done || 0, max: Math.max(stats?.exercises_done || 1, 25), display: `${stats?.exercises_done || 0}` },
    { label: 'Total XP', value: stats?.total_xp || 0, max: Math.max(stats?.total_xp || 1, 200), display: `${stats?.total_xp || 0}` },
  ];

  const barLeft = 120, barRight = 340, barHeight = 18, startY = 65, rowGap = 42;
  const maxBarW = barRight - barLeft;

  const rows = metrics.map((m, i) => {
    const y = startY + i * rowGap;
    const w = Math.round(Math.min(m.value / m.max, 1) * maxBarW);
    return { ...m, x: barLeft, y, w, fullW: maxBarW, h: barHeight, color: CHART_COLORS[i] };
  });

  return { rows, barLeft };
}
