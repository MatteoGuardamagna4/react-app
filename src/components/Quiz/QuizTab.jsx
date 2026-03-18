import { useAppState, useAppDispatch } from '../../context/AppContext.jsx';
import StepAboutYou from './StepAboutYou.jsx';
import StepFitnessLevel from './StepFitnessLevel.jsx';
import StepPreferences from './StepPreferences.jsx';

const STEP_LABELS = ['About You', 'Fitness Level', 'Preferences'];

function StepProgress({ currentStep }) {
  return (
    <div className="step-progress">
      {STEP_LABELS.map((label, i) => (
        <div key={label} style={{ display: 'contents' }}>
          <div
            className={`step-dot ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`}
            title={label}
          />
          {i < STEP_LABELS.length - 1 && (
            <div className={`step-line ${i < currentStep ? 'active' : ''}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function QuizTab() {
  const { quizStep, quizCompleted } = useAppState();
  const dispatch = useAppDispatch();

  if (quizCompleted) {
    return (
      <div className="tab-content fade-in">
        <div className="tab-header">Quiz Complete</div>
        <p className="tab-subtitle">Your profile is set. Switch to the Plan tab to generate your workout.</p>
        <button
          className="btn btn-primary btn-full"
          onClick={() => dispatch({ type: 'SET_TAB', payload: 'plan' })}
        >
          View My Plan
        </button>
      </div>
    );
  }

  return (
    <div className="tab-content fade-in">
      <div className="tab-header">Fitness Quiz</div>
      <p className="tab-subtitle">Step {quizStep + 1} of 3 -- {STEP_LABELS[quizStep]}</p>
      <StepProgress currentStep={quizStep} />

      {quizStep === 0 && <StepAboutYou />}
      {quizStep === 1 && <StepFitnessLevel />}
      {quizStep === 2 && <StepPreferences />}

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        {quizStep > 0 && (
          <button
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={() => dispatch({ type: 'SET_QUIZ_STEP', payload: quizStep - 1 })}
          >
            Back
          </button>
        )}
        {quizStep < 2 ? (
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => dispatch({ type: 'SET_QUIZ_STEP', payload: quizStep + 1 })}
          >
            Next
          </button>
        ) : (
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => dispatch({ type: 'COMPLETE_QUIZ' })}
          >
            Generate Plan
          </button>
        )}
      </div>
    </div>
  );
}
