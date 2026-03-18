import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import workoutRoutes from './routes/workout.js';
import chatRoutes from './routes/chat.js';
import rewardsRoutes from './routes/rewards.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/workout', workoutRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/rewards', rewardsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasApiKey: !!process.env.GROQ_API_KEY });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
