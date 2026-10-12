// Express App setup in TypeScript
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';

import env from './config/env';
import apiRoutes from './routes';
import { notFound, errorHandler } from './middleware/errorHandler';

export const app = express();

// 1. Security Headers
app.use(helmet());

// 2. CORS configuration
const allowedOrigins = [
  env.clientUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://wastewallet.vercel.app',
];
app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        env.clientUrl === '*' ||
        origin.endsWith('.vercel.app') ||
        /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
        /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      // Permissive fallback for mobile devices and preview domains
      return callback(null, true);
    },
    credentials: true,
  })
);

// 3. Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Health Check & Root Welcome Routes
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'WasteWallet Backend API is running successfully on Render!',
    version: '1.0.0',
    healthCheck: '/health',
    apiDocs: '/api/v1',
  });
});

app.get('/health', (req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    success: true,
    message: 'WasteWallet API is healthy and running (TypeScript)',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbStatus,
    },
  });
});

app.get('/api/v1/health', (req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    success: true,
    message: 'WasteWallet API v1 is healthy and running (TypeScript)',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbStatus,
    },
  });
});

// 5. API v1 Router
app.use('/api/v1', apiRoutes);

// 6. 404 Handler
app.use(notFound);

// 7. Global Central Error Handler
app.use(errorHandler);

export default app;
