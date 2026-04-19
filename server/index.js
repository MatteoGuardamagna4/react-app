import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import workoutRoutes from './routes/workout.js';
import chatRoutes from './routes/chat.js';
import rewardsRoutes from './routes/rewards.js';
import nutritionRoutes from './routes/nutrition.js';
import uploadRoutes from './routes/upload.js';
import trendsRoutes from './routes/trends.js';
import ragRoutes from './routes/rag.js';
import { initializeRAG } from './services/rag.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/workout', workoutRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/trends', trendsRoutes);
app.use('/api/rag', ragRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GROQ_API_KEY,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    hasQdrant: !!(process.env.QDRANT_URL && process.env.QDRANT_API_KEY),
  });
});

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  const ragReady = await initializeRAG();
  if (ragReady) {
    console.log('RAG system ready');
  } else {
    console.warn('RAG unavailable -- coach will work without knowledge retrieval');
  }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});