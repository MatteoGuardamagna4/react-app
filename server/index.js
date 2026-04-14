import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import workoutRoutes from './routes/workout.js';
import chatRoutes from './routes/chat.js';
import rewardsRoutes from './routes/rewards.js';
import plotsRoutes from './routes/plots.js';
import nutritionRoutes from './routes/nutrition.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/workout', workoutRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/plots', plotsRoutes);
app.use('/api/nutrition', nutritionRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasApiKey: !!process.env.GROQ_API_KEY, hasGeminiKey: !!process.env.GEMINI_API_KEY });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});