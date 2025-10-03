import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { config } from 'dotenv';
import { AppDataSource } from './data-source';
import { apiRouter } from './api';

config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', apiRouter);

// Create HTTP server
const server = createServer(app);

// WebSocket setup
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (message) => {
    console.log('Received:', message.toString());
    // WebSocket message handling will be implemented
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

// Initialize database and start server
async function bootstrap(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log('Database connection established');
    
    server.listen(Number(port), () => {
      console.log(`Server running on http://localhost:${port}`);
      console.log('Health endpoint available at: http://localhost:3001/health');
      console.log('Teachers API available at: http://localhost:3001/api/teachers');
    });

    server.on('error', (error) => {
      console.error('Server error:', error);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();