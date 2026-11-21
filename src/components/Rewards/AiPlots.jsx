import BarChart from './charts/BarChart.jsx';
import DonutChart from './charts/DonutChart.jsx';
import ProgressBars from './charts/ProgressBars.jsx';

export default function AiPlots({ stats, plan, completedDays }) {
  if (!stats) return null;
  const enriched = { ...stats, completedDays: completedDays || {} };

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Performance Charts</div>
      <div className="card fade-in" style={{ marginBottom: 12, padding: 8, overflow: 'hidden' }}>
        <BarChart stats={enriched} plan={plan} />
      </div>
      <div className="card fade-in" style={{ marginBottom: 12, padding: 8, animationDelay: '0.15s', overflow: 'hidden' }}>
        <DonutChart stats={enriched} plan={plan} />
      </div>
      <div className="card fade-in" style={{ marginBottom: 12, padding: 8, animationDelay: '0.3s', overflow: 'hidden' }}>
        <ProgressBars stats={enriched} />
      </div>
    </div>
  );
}
