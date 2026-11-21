import { useState } from 'react';
import { useAppState } from '../../context/AppContext.jsx';
import { generateTrends } from '../../services/api.js';

const ICONS = {
  fire: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
    </svg>
  ),
  bolt: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  leaf: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10z"/>
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
    </svg>
  ),
  heart: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  star: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  mountain: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3l4 8 5-5 5 15H2L8 3z"/>
    </svg>
  ),
};

function TrendCard({ trend, index }) {
  const [expanded, setExpanded] = useState(null);
  const icon = ICONS[trend.icon] || ICONS.fire;

  const sections = [
    { key: 'exercises', label: 'Exercises', items: trend.exercises },
    { key: 'dishes', label: 'Dishes', items: trend.dishes },
    { key: 'experiences', label: 'Experiences', items: trend.experiences },
  ];

  return (
    <div className="trend-card fade-in" style={{ animationDelay: `${index * 0.15}s` }}>
      <div className="trend-header">
        <div className="trend-icon">{icon}</div>
        <div>
          <div className="trend-name">{trend.name}</div>
          <div className="trend-desc">{trend.description}</div>
        </div>
      </div>

      <div className="trend-sections">
        {sections.map(({ key, label, items }) => (
          <div key={key} className="trend-section">
            <button
              className={`trend-section-toggle ${expanded === key ? 'open' : ''}`}
              onClick={() => setExpanded(expanded === key ? null : key)}
            >
              {label}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {expanded === key && (
              <div className="trend-items fade-in">
                {items.map((item, i) => (
                  <div key={i} className="trend-item">
                    <div className="trend-item-name">{item.name}</div>
                    <div className="trend-item-desc">{item.description}</div>
                    {item.duration && <span className="trend-item-tag">{item.duration}</span>}
                    {item.calories && <span className="trend-item-tag">{item.calories} kcal</span>}
                    {item.macros && <span className="trend-item-tag">{item.macros}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TrendsTab() {
  const { userData, quizCompleted } = useAppState();
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!quizCompleted) {
    return (
      <div className="tab-content">
        <div className="locked-overlay">
          <div className="locked-icon">LOCKED</div>
          <div className="locked-text">
            Complete the quiz first to get personalized fitness trends.
          </div>
        </div>
      </div>
    );
  }

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateTrends(userData);
      setTrends(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tab-content" style={{ paddingBottom: 24 }}>
      <div className="tab-header">Fitness Trends</div>
      <p className="tab-subtitle">
        Discover this month's top fitness trends with personalized workout, nutrition, and lifestyle suggestions.
      </p>

      {!trends && !loading && (
        <button className="generate-btn" onClick={handleGenerate} disabled={loading}>
          Discover This Month's Trends
        </button>
      )}

      {loading && (
        <div className="trends-loading">
          <div className="spinner" />
          <p>Analyzing current fitness trends...</p>
        </div>
      )}

      {error && (
        <div className="trends-error">
          {error}
          <button className="retry-btn" onClick={handleGenerate}>Retry</button>
        </div>
      )}

      {trends && (
        <div className="trends-container">
          <div className="trends-month">{trends.month}</div>
          {trends.trends.map((trend, i) => (
            <TrendCard key={i} trend={trend} index={i} />
          ))}
          <button
            className="generate-btn refresh-btn"
            onClick={handleGenerate}
            disabled={loading}
          >
            Refresh Trends
          </button>
        </div>
      )}
    </div>
  );
}
