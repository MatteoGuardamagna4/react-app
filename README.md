# Smart Workout Recommender

## Setup
#### Option 1 (full features)
1. Clone the repo
2. Create a `.env` file in the root:
```
GROQ_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
QDRANT_URL=your_qdrant_cluster_url
QDRANT_API_KEY=your_qdrant_api_key
```
3. **Run the app**
```
   npm install && npm run dev
```

 #### Option 2 -- Hosted prototype (LLM features disabled)
[View on Hugging Face Spaces](https://huggingface.co/spaces/MatteoG4444/smart-workout-recommender_prototype)

---

## Project Description

Smart Workout Recommender is a full-stack fitness application that generates personalized weekly workout plans, provides real-time AI coaching, and tracks user progress through gamified rewards. The app collects user data via a guided quiz (body metrics, fitness level, workout preferences), feeds it through a rule-based clustering algorithm to categorize fitness profiles, and then leverages large language models to produce tailored exercise programs and conversational coaching.

The project was originally prototyped in Python (Streamlit + KMeans clustering) and has been fully ported to a JavaScript-only stack for faster iteration and simpler deployment.

## Architecture

### System Overview

```mermaid
graph LR
  subgraph Browser ["Browser (Vite + React :5173)"]
    A[QuizTab] --> B[PlanTab]
    B --> C[CoachTab]
    B --> D[InsightsTab]
    B --> E[RewardsTab]
  end

  subgraph Server ["Express Server (:3001)"]
    R1["/api/workout/generate"]
    R2["/api/chat"]
    R3["/api/rewards/calculate"]
    R4["/api/rag/query"]
  end

  subgraph Services ["Backend Services"]
    P["preprocessing.js\n(rule-based clustering)"]
    G["groq.js\n(Llama 3.3 70B)"]
    RAG["rag.js + qdrant.js\n(OpenAI embeddings + vector search)"]
  end

  A -- "user profile" --> R1
  C -- "message + history" --> R2
  E -- "completedDays + plan" --> R3
  C -- "knowledge query" --> R4

  R1 --> P --> G
  R2 --> G
  R2 --> RAG
  R3 --> G
  R4 --> RAG
```

### Data Flow

```mermaid
flowchart TD
  Q["Quiz\n(3-step assessment)"] -->|user profile + BMI| CL["Clustering\n(4 fitness profiles)"]
  CL -->|cluster + profile| LLM1["Groq LLM\n(Llama 3.3 70B)"]
  LLM1 -->|7-day plan JSON| PLAN["Plan Tab\n(exercises + checkboxes)"]
  PLAN -->|completed days| COACH["Coach Tab\n(multi-turn chat)"]
  PLAN -->|completed days| INS["Insights Tab\n(4 client-side SVGs)"]
  PLAN -->|completion stats| REW["Rewards Tab\n(XP + achievements)"]
  REW -->|stats + plan| CHARTS["Performance Charts\n(bar, donut, progress - client-side SVG)"]
  COACH -->|message| LLM1
  COACH -->|retrieval| VS["Qdrant\n(vector search)"]
  REW -->|stats| LLM1
```

### File Structure

```mermaid
graph TD
  subgraph Frontend ["src/"]
    APP["App.jsx"] --> QUIZ["components/Quiz/\nQuizTab, StepAboutYou,\nStepFitnessLevel, StepPreferences,\nBmiGauge"]
    APP --> PLNC["components/Plan/\nPlanTab"]
    APP --> COAC["components/Coach/\nCoachTab"]
    APP --> INSC["components/Insights/\nInsightsTab, WeeklyBars,\nMuscleRadar, CalorieCurve,\nBodyHeatMap"]
    APP --> REWC["components/Rewards/\nRewardsTab, AiPlots"]
    APP --> CTX["context/AppContext.jsx\n(useReducer store)"]
    APP --> API["services/api.js\n(fetch wrapper)"]
  end

  subgraph Backend ["server/"]
    IDX["index.js"] --> WR["routes/workout.js"]
    IDX --> CR["routes/chat.js"]
    IDX --> RR["routes/rewards.js"]
    IDX --> RAGR["routes/rag.js"]
    IDX --> UP["routes/upload.js"]
    WR --> PRE["services/preprocessing.js"]
    WR --> GRQ["services/groq.js"]
    CR --> GRQ
    CR --> RAGS["services/rag.js"]
    RR --> GRQ
    RAGR --> RAGS
    UP --> RAGS
    RAGS --> OAI["services/openai.js"]
    RAGS --> QD["services/qdrant.js"]
  end
```

### Frontend

Built with Vite and React (JSX, no TypeScript). State is managed through a single React Context + `useReducer` pattern in `src/context/AppContext.jsx`, which holds user profile data, the generated plan, completion state, and chat history. The UI is organized into five tabs: Quiz, Plan, Coach, Insights, and Rewards. The Insights tab provides four hand-coded SVG visualizations (weekly bar chart, muscle radar, calorie curve, body heatmap) that render client-side without any LLM dependency. The UI renders inside a phone-shaped frame on desktop (500px wide) and switches to full-screen on mobile below 600px. Styling uses custom CSS with a dark gradient theme (purple to pink to warm orange), with no CSS framework dependencies.

### Backend

A lightweight Express server (ESM) running on port 3001. Four route modules handle the core endpoints. The preprocessing service replaces the original Python KMeans model with a deterministic rule-based clustering algorithm that assigns users to one of four fitness profiles (sedentary, light, moderate, athletic) based on activity level, experience, and BMI. This profile is then injected into LLM prompts for personalized output.

### LLM Integration

Two model providers serve different purposes:
- **Groq** (Llama 3.3 70B Versatile) handles text generation: workout plans, coaching chat, and reward narratives. The Groq service includes mock fallbacks so the app remains functional without an API key.
- **OpenAI** powers the RAG pipeline: `text-embedding-3-large` for embeddings and `gpt-4o-mini` for retrieval-augmented answer synthesis. Vectors are stored in **Qdrant**, a cloud-hosted vector database. Users can upload PDFs (chunked, embedded, and indexed) and the Coach tab silently injects retrieved context into replies.

### Key Design Decisions

- **No database for app state**: user quiz, plan, chat sessions, and rewards all live in the browser (localStorage-backed React Context). Only knowledge vectors persist server-side in Qdrant.
- **Client-side charts**: all Rewards and Insights visualizations are pure JSX SVG built from pre-computed geometry. No server-side image generation, no LLM variability in the visual layer.
- **Mock fallbacks where it matters**: every Groq-dependent feature degrades gracefully when the key is missing, making it easy to demo and develop offline.
