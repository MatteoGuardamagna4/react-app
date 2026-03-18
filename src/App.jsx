import { useAppState, useAppDispatch } from './context/AppContext.jsx';
import PhoneFrame from './components/PhoneFrame.jsx';
import QuizTab from './components/Quiz/QuizTab.jsx';
import PlanTab from './components/Plan/PlanTab.jsx';
import CoachTab from './components/Coach/CoachTab.jsx';
import RewardsTab from './components/Rewards/RewardsTab.jsx';
import InsightsTab from './components/Insights/InsightsTab.jsx';

const TABS = [
  { id: 'quiz', label: 'Quiz', icon: 'Q' },
  { id: 'plan', label: 'Plan', icon: 'P' },
  { id: 'coach', label: 'Coach', icon: 'C' },
  { id: 'rewards', label: 'Rewards', icon: 'R' },
  { id: 'insights', label: 'Insights', icon: 'I' },
];

function TabContent() {
  const { activeTab } = useAppState();
  switch (activeTab) {
    case 'quiz': return <QuizTab />;
    case 'plan': return <PlanTab />;
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

export default function App() {
  return (
    <PhoneFrame>
      <div className="phone-content">
        <TabContent />
      </div>
      <Navigation />
    </PhoneFrame>
  );
}
