import { Router } from 'express';
import { callGemini } from '../services/gemini.js';

const router = Router();

const COLORS = ['#6C63FF', '#a855f7', '#f97316', '#22d3ee', '#4ade80', '#f472b6', '#facc15'];

// ── Pre-compute exact pixel geometry so the LLM doesn't have to do math ──

function computeBarChart(stats, plan) {
  const days = (plan?.days || []).map(d => d.day?.slice(0, 3) || '?');
  const counts = (plan?.days || []).map(d => (d.exercises || []).length);
  const completed = (plan?.days || []).map(d => (stats.completedDays?.[d.day] ? true : false));
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
    const color = completed[i] ? COLORS[i % COLORS.length] : '#444466';
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

function computeDonutChart(stats, plan) {
  const muscleTally = {};
  for (const d of (plan?.days || [])) {
    if (stats.completedDays?.[d.day]) {
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
    return { name, pct: Math.round((count / total) * 100), path, color: COLORS[i % COLORS.length] };
  });

  return { slices, cx, cy, total };
}

function computeHorizontalBars(stats) {
  const metrics = [
    { label: 'Completion', value: stats.completion_rate || 0, max: 100, display: `${Math.round(stats.completion_rate || 0)}%` },
    { label: 'Best Streak', value: stats.max_streak || 0, max: 7, display: `${stats.max_streak || 0} days` },
    { label: 'Exercises Done', value: stats.exercises_done || 0, max: Math.max(stats.exercises_done || 1, 25), display: `${stats.exercises_done || 0}` },
    { label: 'Total XP', value: stats.total_xp || 0, max: Math.max(stats.total_xp || 1, 200), display: `${stats.total_xp || 0}` },
  ];

  const barLeft = 120, barRight = 340, barHeight = 18, startY = 65, rowGap = 42;
  const maxBarW = barRight - barLeft;

  const rows = metrics.map((m, i) => {
    const y = startY + i * rowGap;
    const w = Math.round(Math.min(m.value / m.max, 1) * maxBarW);
    return { ...m, x: barLeft, y, w, fullW: maxBarW, h: barHeight, color: COLORS[i] };
  });

  return { rows, barLeft };
}

function r2(n) { return Math.round(n * 100) / 100; }

// ── Prompts with pre-computed geometry ──

function barPrompt(geo) {
  const barSpecs = geo.bars.map(b =>
    `  <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="6" fill="${b.color}"/>` +
    `\n  <text x="${b.x + b.w / 2}" y="${geo.chartBottom + 16}" text-anchor="middle" font-size="11" fill="#e2e8f0">${b.label}</text>` +
    (b.h > 0 ? `\n  <text x="${b.x + b.w / 2}" y="${b.y - 5}" text-anchor="middle" font-size="10" fill="#e2e8f0">${b.value}</text>` : '')
  ).join('\n');

  const gridSpecs = geo.gridLines.map(g =>
    `  <line x1="${geo.chartLeft}" y1="${g.y}" x2="355" y2="${g.y}" stroke="#e2e8f0" stroke-opacity="0.1"/>` +
    `\n  <text x="${geo.chartLeft - 8}" y="${g.y + 4}" text-anchor="end" font-size="10" fill="#e2e8f0" fill-opacity="0.5">${g.label}</text>`
  ).join('\n');

  return `You output ONLY a single raw SVG element. No markdown, no backticks, no explanation.

Build a bar chart SVG. I have pre-computed the exact bar positions -- use them verbatim.
Add a creative title, the axes lines, and any subtle decorative touches you like (gradients, glow, patterns) but do NOT change the bar coordinates.

SVG setup: viewBox="0 0 380 260" width="100%". Background rect fill="#1a1a2e". font-family="system-ui,sans-serif". All text fill="#e2e8f0".

Grid lines (draw these first):
${gridSpecs}

Y-axis line: x1="${geo.chartLeft}" y1="${geo.chartBottom}" to x1="${geo.chartLeft}" y1="45"
X-axis line: x1="${geo.chartLeft}" y1="${geo.chartBottom}" to x1="355" y1="${geo.chartBottom}"

Bars and labels (copy exactly):
${barSpecs}

Add a creative title at y="30" centered at x="190". Greyed-out bars mean the day was skipped.`;
}

function donutPrompt(geo) {
  const sliceSpecs = geo.slices.map(s =>
    `  <path d="${s.path}" fill="${s.color}"/>`
  ).join('\n');

  const legendStartY = 75;
  const legendSpecs = geo.slices.map((s, i) =>
    `  <rect x="225" y="${legendStartY + i * 24}" width="12" height="12" rx="2" fill="${s.color}"/>` +
    `\n  <text x="243" y="${legendStartY + i * 24 + 10}" font-size="12" fill="#e2e8f0">${s.name} ${s.pct}%</text>`
  ).join('\n');

  return `You output ONLY a single raw SVG element. No markdown, no backticks, no explanation.

Build a CLEAN donut chart SVG. I have pre-computed the exact arc paths and legend -- use them EXACTLY as given. Do NOT add any extra labels, text, percentages, or annotations beyond what I provide. Keep it minimal.

SVG setup: viewBox="0 0 380 260" width="100%". Background rect fill="#1a1a2e". font-family="system-ui,sans-serif". All text fill="#e2e8f0".

Title: add ONE short creative title at y="30" centered at x="190", font-size="16".

Donut slices (copy exactly, do not add labels on or around the slices):
${sliceSpecs}

Center of donut: (${geo.cx}, ${geo.cy}). Add a center text showing "${geo.total}" with a small label "total" below it.

Legend on the right (copy exactly, do NOT add anything else):
${legendSpecs}

IMPORTANT: Do NOT add any other text, labels, annotations, stats, or decorations. The chart should be clean and minimal.`;
}

function statsPrompt(geo) {
  const rowSpecs = geo.rows.map(row =>
    `  <!-- ${row.label} -->
  <text x="${row.x - 8}" y="${row.y + row.h / 2 + 4}" text-anchor="end" font-size="12" fill="#e2e8f0">${row.label}</text>
  <rect x="${row.x}" y="${row.y}" width="${row.fullW}" height="${row.h}" rx="9" fill="#e2e8f0" fill-opacity="0.08"/>
  <rect x="${row.x}" y="${row.y}" width="${row.w}" height="${row.h}" rx="9" fill="${row.color}"/>
  <text x="${row.x + row.w + 8}" y="${row.y + row.h / 2 + 4}" font-size="11" fill="#e2e8f0">${row.display}</text>`
  ).join('\n');

  return `You output ONLY a single raw SVG element. No markdown, no backticks, no explanation.

Build a horizontal progress bars chart. I have pre-computed the exact bar positions -- use them EXACTLY as given. Do NOT add extra labels, stats, or annotations beyond what I provide. Keep it clean.

SVG setup: viewBox="0 0 380 260" width="100%". Background rect fill="#1a1a2e". font-family="system-ui,sans-serif". All text fill="#e2e8f0".

Title: add ONE short creative title at y="35" centered at x="190", font-size="16".

Progress bars (copy exactly):
${rowSpecs}

IMPORTANT: Do NOT add any other text, labels, annotations, or decorations beyond the title and the bars above.`;
}

function extractSvg(raw) {
  if (!raw) return null;
  let text = raw.replace(/^```[a-z]*\n?/gm, '').replace(/\n?```$/gm, '').trim();
  const start = text.indexOf('<svg');
  if (start === -1) return null;
  const end = text.lastIndexOf('</svg>');
  if (end === -1) return null;
  return text.slice(start, end + 6);
}

router.post('/generate', async (req, res) => {
  try {
    const { stats, plan, userData, completedDays } = req.body;
    const enrichedStats = { ...stats, completedDays: completedDays || {} };

    const barGeo = computeBarChart(enrichedStats, plan);
    const donutGeo = computeDonutChart(enrichedStats, plan);
    const statsGeo = computeHorizontalBars(enrichedStats);

    const prompts = [
      barPrompt(barGeo),
      donutPrompt(donutGeo),
      statsPrompt(statsGeo),
    ];

    // Generate sequentially to avoid burning rate-limit slots
    const charts = [];
    for (const p of prompts) {
      try {
        const raw = await callGemini({ prompt: p, temperature: 0.8, maxTokens: 4096 });
        const svg = extractSvg(raw);
        if (svg) charts.push(svg);
      } catch (e) {
        console.error('Chart generation failed:', e.message?.slice(0, 120));
      }
    }

    if (charts.length === 0) {
      return res.status(503).json({ error: 'Could not generate plots. Check your GEMINI_API_KEY.' });
    }

    res.json({ charts });
  } catch (error) {
    console.error('Plots error:', error);
    res.status(500).json({ error: 'Failed to generate plots' });
  }
});

export default router;
