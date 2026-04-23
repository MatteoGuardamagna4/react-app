---
title: Smart Workout Recommender
emoji: 🏋️
colorFrom: purple
colorTo: pink
sdk: docker
app_port: 7860
pinned: false
---

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
[View on Hugging Face Spaces](https://huggingface.co/spaces/MatteoG4444/v3-wtk-recommender)

---

## Project Description

Smart Workout Recommender is a full-stack fitness application that generates personalized weekly workout plans, daily meal plans, monthly fitness trend digests, real-time AI coaching, and gamified progress tracking. The app collects user data via a guided quiz (body metrics, fitness level, workout preferences), feeds it through a rule-based clustering algorithm to categorize fitness profiles, and then leverages large language models to produce tailored exercise programs, nutrition, and conversational coaching. Progress is rendered into hand-coded SVG visualizations across the Insights, Rewards, and Nutrition tabs.

The project was originally prototyped in Python (Streamlit + KMeans clustering) and has been fully ported to a JavaScript-only stack for faster iteration and simpler deployment.

## Architecture

### System Overview

```mermaid
graph LR
  subgraph Browser ["Browser (Vite + React :5173)"]
    A[QuizTab] --> B[PlanTab]
    B --> N[NutritionTab]
    B --> C[CoachTab]
    B --> E[RewardsTab]
    B --> D[InsightsTab]
    A --> T[TrendsTab]
  end

  subgraph Server ["Express Server (:3001)"]
    R1["/api/workout/generate"]
    R2["/api/chat"]
    R3["/api/rewards/calculate"]
    R4["/api/rag/query"]
    R5["/api/nutrition/generate"]
    R6["/api/trends/generate"]
  end

  subgraph Services ["Backend Services"]
    P["preprocessing.js\n(rule-based clustering)"]
    G["groq.js\n(Llama 3.3 70B)"]
    RAG["rag.js + qdrant.js\n(OpenAI embeddings + vector search)"]
  end

  A -- "user profile" --> R1
  N -- "profile + plan + feedback" --> R5
  C -- "message + history" --> R2
  E -- "completedDays + plan" --> R3
  C -- "knowledge query" --> R4
  T -- "profile" --> R6

  R1 --> P --> G
  R2 --> G
  R2 --> RAG
  R3 --> G
  R5 --> G
  R6 --> G
  R4 --> RAG
```

### Data Flow

```mermaid
flowchart TD
  Q["Quiz\n(3-step assessment)"] -->|user profile + BMI| CL["Clustering\n(4 fitness profiles)"]
  CL -->|cluster + profile| LLM1["Groq LLM\n(Llama 3.3 70B)"]
  LLM1 -->|7-day plan JSON| PLAN["Plan Tab\n(exercises + checkboxes + feedback)"]
  PLAN -->|plan + feedback| NUT["Nutrition Tab\n(daily meals + MacroRing donut)"]
  PLAN -->|completed days| COACH["Coach Tab\n(multi-turn chat)"]
  PLAN -->|days + completion| INS["Insights Tab\n(WeeklyBars, MuscleRadar,\nCalorieCurve, BodyHeatMap)"]
  PLAN -->|completion stats| REW["Rewards Tab\n(XP + achievements)"]
  REW -->|stats + plan| CHARTS["Performance Charts\n(BarChart, DonutChart,\nProgressBars - client-side SVG)"]
  Q -->|profile| TRN["Trends Tab\n(monthly AI digest)"]
  TRN --> LLM1
  NUT --> LLM1
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
    APP --> NUTC["components/Nutrition/\nNutritionTab, MacroRing"]
    APP --> COAC["components/Coach/\nCoachTab"]
    APP --> REWC["components/Rewards/\nRewardsTab, AiPlots,\ncharts/BarChart, DonutChart,\nProgressBars, chartGeometry"]
    APP --> INSC["components/Insights/\nInsightsTab, WeeklyBars,\nMuscleRadar, CalorieCurve,\nBodyHeatMap"]
    APP --> TRNC["components/Trends/\nTrendsTab"]
    APP --> CTX["context/AppContext.jsx\n(useReducer store)"]
    APP --> API["services/api.js\n(fetch wrapper)"]
  end

  subgraph Backend ["server/"]
    IDX["index.js"] --> WR["routes/workout.js"]
    IDX --> NR["routes/nutrition.js"]
    IDX --> CR["routes/chat.js"]
    IDX --> RR["routes/rewards.js"]
    IDX --> TR["routes/trends.js"]
    IDX --> RAGR["routes/rag.js"]
    IDX --> UP["routes/upload.js"]
    WR --> PRE["services/preprocessing.js"]
    WR --> GRQ["services/groq.js"]
    NR --> GRQ
    CR --> GRQ
    CR --> RAGS["services/rag.js"]
    RR --> GRQ
    TR --> GRQ
    TR --> TI["services/trendIngest.js"]
    RAGR --> RAGS
    UP --> RAGS
    UP --> CH["services/chunker.js"]
    RAGS --> OAI["services/openai.js"]
    RAGS --> QD["services/qdrant.js"]
  end
```

### Frontend

Built with Vite and React (JSX, no TypeScript). State is managed through a single React Context + `useReducer` pattern in `src/context/AppContext.jsx`, which holds user profile data, the generated plan, completion state, nutrition plan, chat history, per-exercise and per-meal feedback, and the Rewards payload -- all persisted to localStorage so sessions survive reloads. The UI is organized into seven tabs: Quiz, Plan, Nutrition, Coach, Rewards, Insights, and Trends. The UI renders inside a phone-shaped frame on desktop (500px wide) and switches to full-screen on mobile below 600px. Styling uses custom CSS with a dark gradient theme (purple to pink to warm orange), with no CSS framework dependencies.

### Backend

A lightweight Express server (ESM) running on port 3001. Seven route modules (`workout`, `nutrition`, `chat`, `rewards`, `trends`, `rag`, `upload`) handle the core endpoints. The preprocessing service replaces the original Python KMeans model with a deterministic rule-based clustering algorithm that assigns users to one of four fitness profiles (sedentary, light, moderate, athletic) based on activity level, experience, and BMI. This profile is then injected into LLM prompts for personalized output. A `trendIngest` service seeds the monthly Trends digest, and a `chunker` service splits uploaded PDFs before embedding them through the RAG pipeline.

### Visualizations

All charts are hand-coded SVG rendered client-side from pre-computed geometry -- no charting library, no server-side image generation, no LLM variability in the visual layer. There are eight distinct graphs split across three tabs:

**Insights tab** (four charts driven by the generated plan and completion state, plus a three-stat summary strip for workout days, weekly kcal, and categories hit):

- `WeeklyBars` -- seven gradient bars, one per day, sized by exercise count. Completed days switch to a green-to-purple gradient with a soft drop-shadow; rest days render dim with a "rest" label.
- `MuscleRadar` -- six-axis radar (Upper Body, Lower Body, Core, Cardio, Flexibility, Full Body) with four concentric rings. Each day's focus is matched to categories via keyword rules in `InsightsTab.jsx`, with Full Body distributing partial credit across axes.
- `CalorieCurve` -- daily estimated kcal burn across the week, scaled from the cluster's average calorie baseline and the day's exercise count (with diminishing returns past six exercises).
- `BodyHeatMap` -- anatomical outline with muscle regions shaded by normalized category intensity, so the viewer sees at a glance which areas carry the load.

**Rewards tab** (three charts under the "Performance Charts" heading, computed in `charts/chartGeometry.js`, plus the XP progress bar and grade display):

- `BarChart` -- "Weekly Exercise Count" vertical bars with gridlines and value labels, one bar per day.
- `DonutChart` -- "Muscle Group Distribution" pie with center-total, percentages, and a color-keyed legend.
- `ProgressBars` -- "Your Progress" horizontal bars for completion rate, best streak, and related stats.

**Nutrition tab**:

- `MacroRing` -- three concentric arcs (protein, carbs, fat) wrapping the daily calorie target in the center, stacked around a single circle so the ring doubles as a macro-split legend.

### LLM Integration

Two model providers serve different purposes:
- **Groq** (Llama 3.3 70B Versatile) handles text generation: workout plans, daily meal plans, coaching chat, reward narratives, and the monthly fitness trend digest. The Groq service includes mock fallbacks so the app remains functional without an API key.
- **OpenAI** powers the RAG pipeline: `text-embedding-3-large` for embeddings and `gpt-4o-mini` for retrieval-augmented answer synthesis. Vectors are stored in **Qdrant**, a cloud-hosted vector database. Users can upload PDFs (chunked, embedded, and indexed) and the Coach tab silently injects retrieved context into replies.

### Key Design Decisions

- **No database for app state**: user quiz, plan, chat sessions, and rewards all live in the browser (localStorage-backed React Context). Only knowledge vectors persist server-side in Qdrant.
- **Client-side charts**: all Rewards and Insights visualizations are pure JSX SVG built from pre-computed geometry. No server-side image generation, no LLM variability in the visual layer.
- **Mock fallbacks where it matters**: every Groq-dependent feature degrades gracefully when the key is missing, making it easy to demo and develop offline.
