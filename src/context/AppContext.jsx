import { createContext, useContext, useReducer, useEffect } from 'react';

const AppContext = createContext(null);
const AppDispatchContext = createContext(null);

const STORAGE_KEY = 'swr_app_state';

const defaultState = {
  activeTab: 'quiz',
  quizCompleted: false,
  quizStep: 0,
  userData: {
    age: 25,
    gender: 'Male',
    weight_kg: 75,
    height_m: 1.75,
    experience_level: 1,
    workout_frequency: 3,
    session_duration: 1,
    water_intake: 2,
    goal: 'General Fitness',
    preferred_type: 'Mix',
    equipment: [],
    has_injury: false,
    injury_details: '',
  },
  cluster: null,
  clusterInfo: null,
  workoutPlan: null,
  completedDays: {},
  chatMessages: [],
  rewardsData: null,
  feedback: {},
  nutritionPlan: null,
  loading: {},
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const saved = JSON.parse(raw);
    return { ...defaultState, ...saved, loading: {} };
  } catch {
    return defaultState;
  }
}

const PERSISTED_KEYS = [
  'activeTab', 'quizCompleted', 'quizStep', 'userData',
  'cluster', 'clusterInfo', 'workoutPlan', 'completedDays',
  'chatMessages', 'rewardsData', 'feedback', 'nutritionPlan',
];

function saveState(state) {
  try {
    const toSave = {};
    for (const key of PERSISTED_KEYS) {
      toSave[key] = state[key];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch { /* quota exceeded -- silently ignore */ }
}

const initialState = loadState();

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_QUIZ_STEP':
      return { ...state, quizStep: action.payload };
    case 'UPDATE_USER_DATA':
      return { ...state, userData: { ...state.userData, ...action.payload } };
    case 'COMPLETE_QUIZ':
      return { ...state, quizCompleted: true, activeTab: 'plan' };
    case 'SET_PLAN':
      return {
        ...state,
        workoutPlan: action.payload.plan,
        cluster: action.payload.cluster,
        clusterInfo: action.payload.clusterInfo,
        completedDays: {},
        rewardsData: null,
      };
    case 'TOGGLE_DAY':
      return {
        ...state,
        completedDays: {
          ...state.completedDays,
          [action.payload]: !state.completedDays[action.payload],
        },
      };
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.payload] };
    case 'SET_REWARDS':
      return { ...state, rewardsData: action.payload };
    case 'SET_FEEDBACK':
      return { ...state, feedback: { ...state.feedback, [action.payload.key]: action.payload.value } };
    case 'SET_NUTRITION':
      return { ...state, nutritionPlan: action.payload };
    case 'RESET_ALL':
      return { ...defaultState };
    case 'SET_LOADING':
      return { ...state, loading: { ...state.loading, [action.payload.key]: action.payload.value } };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <AppContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppContext.Provider>
  );
}

export function useAppState() { return useContext(AppContext); }
export function useAppDispatch() { return useContext(AppDispatchContext); }
