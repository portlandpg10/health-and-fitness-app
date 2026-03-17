import './env.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { db } from './db/schema.js';
import { authMiddleware, isAuthEnabled } from './middleware/auth.js';

import weightRoutes from './routes/weight.js';
import liftsRoutes from './routes/lifts.js';
import workoutsRoutes from './routes/workouts.js';
import authRoutes from './routes/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.use(authMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/weight', weightRoutes);
app.use('/api/lifts', liftsRoutes);
app.use('/api/workouts', workoutsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, authEnabled: isAuthEnabled() });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
