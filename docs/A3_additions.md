# Smart Workout Recommender — What's New in v3

## Where v2 Left Off

The Assignment 2 prototype was already a working, full-stack fitness app: a 3-step quiz, a Groq-generated 7-day plan, a Coach chatbot, a Rewards tab with LLM-drawn SVG charts, and an Insights tab with client-side visualisations. It worked, but two things nagged at me. First, the Coach was "just another LLM" — every answer was the model's general knowledge, with no way to ground it in actual fitness literature or tell the user where a claim came from. Second, the feedback signals I had built (thumbs up/down on chat responses and exercises) were collected but under-used: only the Coach prompt consumed them, and the workout/nutrition side of the app never closed the loop. v3 is my attempt to fix both of those, plus a few deployment-related chores I kept putting off. Below are the changes I consider substantive.

## From Chatbot to RAG-backed Coach

The biggest shift is that the Coach is no longer a bare LLM. I built a full retrieval pipeline: OpenAI `text-embedding-3-large` for embeddings, `gpt-4o-mini` for synthesis, and Qdrant Cloud as the vector store (collection `fitness_knowledge`, 3072-dim cosine). The new services live in `server/services/rag.js`, `qdrant.js`, `openai.js`, and `chunker.js`, with a dedicated `POST /api/rag/query` route. Every time the user sends a Coach message, `retrieveContext()` pulls the top-k chunks and I stitch them into the system prompt along with explicit citation rules (`buildRagBlock` in `server/routes/chat.js`). The model is instructed to append `[n]` markers to grounded statements.

Crucially, I wanted the citations to be visible, not buried in the prompt. So the Coach UI parses those markers (`MessageContent.jsx`), renders clickable source chips under each reply (`SourceReferences.jsx`), and opens a modal showing the actual retrieved chunks plus a link to the original article when one is available (`SourceViewer.jsx`). It turns the Coach from a black box into something the user can audit.

To make the knowledge base extensible rather than a static index, I also added a PDF ingestion endpoint (`server/routes/upload.js`) using `multer` and `pdf-parse` v2. Users (or I, during demos) can drop in a fitness PDF up to 20 MB; the server extracts text, chunks it with a deterministic UUID-v5 scheme so re-uploads don't duplicate vectors, embeds, and upserts it into Qdrant.

## A Trends Tab That Grows the Knowledge Base

I added a seventh tab, **Trends**, for two reasons. The product reason: I wanted a "what's hot this month" surface that feels different from the static 7-day plan — top 3 monthly fitness trends, each with three exercises, two dishes, and two experience suggestions, personalised to the user's goal and equipment (`server/routes/trends.js`, `src/components/Trends/TrendsTab.jsx`).

The architectural reason is more interesting: the Trends endpoint fires a background ingestion job (`server/services/trendIngest.js`) that uses the three discovered trends to generate five long-form knowledge briefings (900–1200 words each, overview + deep-dive prompts), chunks them, embeds them, and upserts them into the same Qdrant collection the Coach retrieves from. So every time a user refreshes their trends, the Coach gets smarter about topics that are actually relevant right now. The response isn't blocked on this — it's fire-and-forget, so the UI stays snappy.

## A Dedicated Nutrition Tab

In v2 nutrition was a paragraph at the bottom of the plan. In v3 it's its own tab (`src/components/Nutrition/NutritionTab.jsx`) with a proper daily meal plan, a macro ring chart I built from scratch (`MacroRing.jsx`), calorie targets, pre/post-workout meal flags, and a supplement section. The LLM call lives in `server/routes/nutrition.js` and receives the same user profile as the workout generator so the macros line up with the training load. Each meal has a thumbs-up/down, and that feeds into the same feedback loop as the workout plan.

## Closing the Feedback Loop Across Three Tabs

This is the smaller change that punches above its weight. I factored out a shared `src/utils/feedback.js` with `summarizeExerciseFeedback` and `summarizeMealFeedback` helpers. Before, the `feedback` object in state was only consumed by the Coach's system prompt. Now, when the Plan tab regenerates a workout or the Nutrition tab regenerates a meal plan, a summary of liked/disliked items is passed to the LLM as a "keep more of this, less of that" instruction. The result is that the more a user interacts, the more each regeneration reflects their taste — not just in chat, but in the actual plans they follow.

## Rewards: Swapping Gemini Plots for Deterministic SVG

The v2 Rewards tab relied on Gemini to generate SVG charts server-side — clever in a demo, painful in practice. It was slow, the output sometimes drifted stylistically between renders, and it was the only reason I was holding onto a Gemini dependency at all. I deleted `server/routes/plots.js` (308 lines) and `server/services/gemini.js` and rebuilt the charts as small, pure-React SVG components: `BarChart.jsx`, `DonutChart.jsx`, `ProgressBars.jsx`, and a shared `chartGeometry.js` for the coordinate math. Rewards now renders instantly with no network call and no variance between loads. Determinism felt more valuable than "AI-generated visuals" here — the data is already deterministic, so the chart should be too.

## Housekeeping

A few supporting changes round things out. I removed Gemini from `package.json` and added `openai`, `@qdrant/js-client-rest`, `multer`, and `pdf-parse`.

## In One Sentence

v3 turns the Coach into a retrieval-grounded assistant whose knowledge base grows each time a user explores trends, promotes nutrition to a first-class tab, and makes every thumbs-up actually change what the user sees next.
