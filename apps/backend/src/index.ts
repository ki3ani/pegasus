import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import portfolioRoutes from './routes/portfolioRoutes.js';
import pricesRoutes from './routes/pricesRoutes.js';
import jobsRoutes from './routes/jobsRoutes.js';
import { tradingRoutes } from './routes/tradingRoutes.js';
import { kaleRoutes } from './routes/kaleRoutes.js';
import { startPriceUpdateJob } from './jobs/priceUpdateJob.js';

config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/prices', pricesRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/kale', kaleRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'RebalanceX API is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'RebalanceX API is running', timestamp: new Date().toISOString() });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 WebSocket server ready`);
  
  // Start background jobs
  startPriceUpdateJob();
});