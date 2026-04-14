import { useAppState, useAppDispatch } from './context/AppContext.jsx';
import PhoneFrame from './components/PhoneFrame.jsx';
import QuizTab from './components/Quiz/QuizTab.jsx';
import PlanTab from './components/Plan/PlanTab.jsx';
import CoachTab from './components/Coach/CoachTab.jsx';
import RewardsTab from './components/Rewards/RewardsTab.jsx';
import InsightsTab from './components/Insights/InsightsTab.jsx';
import NutritionTab from './components/Nutrition/NutritionTab.jsx';

const TABS = [
  { id: 'quiz', label: 'Quiz', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    </svg>
  )},
  { id: 'plan', label: 'Plan', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )},
  { id: 'nutrition', label: 'Meals', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
      <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
    </svg>
  )},
  { id: 'coach', label: 'Coach', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )},
  { id: 'rewards', label: 'Rewards', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
    </svg>
  )},
  { id: 'insights', label: 'Insights', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )},
];

function TabContent() {
  const { activeTab } = useAppState();
  switch (activeTab) {
    case 'quiz': return <QuizTab />;
    case 'plan': return <PlanTab />;
    case 'nutrition': return <NutritionTab />;
    case 'coach': return <CoachTab />;
    case 'rewards': return <RewardsTab />;
    case 'insights': return <InsightsTab />;
    default: return <QuizTab />;
  }
}

function Navigation() {
  const { activeTab, quizCompleted } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <nav className="nav-tabs">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => {
            if (tab.id !== 'quiz' && !quizCompleted) return;
            dispatch({ type: 'SET_TAB', payload: tab.id });
          }}
          style={{
            opacity: tab.id !== 'quiz' && !quizCompleted ? 0.35 : 1,
          }}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

function ResetBanner() {
  const { quizCompleted } = useAppState();
  const dispatch = useAppDispatch();

  if (!quizCompleted) return null;

  return (
    <button
      className="reset-banner"
      onClick={() => {
        if (window.confirm('Reset all data and start over?')) {
          dispatch({ type: 'RESET_ALL' });
        }
      }}
    >
      Start Over
    </button>
  );
}

export default function App() {
  return (
    <PhoneFrame>
      <div className="phone-content">
        <ResetBanner />
        <TabContent />
      </div>
      <Navigation />
    </PhoneFrame>
  );
}
