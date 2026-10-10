// Express App configuration (Routes, Middleware, Security)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const { clientUrl } = require('./config/env');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// 1. Security Headers
app.use(helmet());

// 2. Cross-Origin Resource Sharing (CORS)
const allowedOrigins = [clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
  })
);

// 3. Request body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Health Check Route
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    success: true,
    message: 'WasteWallet API is healthy and running',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbStatus,
    },
  });
});

// Also alias under /api/v1/health
app.get('/api/v1/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    success: true,
    message: 'WasteWallet API v1 is healthy and running',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbStatus,
    },
  });
});

// 5. Mount API v1 Routes
const apiRoutes = require('./routes');
app.use('/api/v1', apiRoutes);

// 6. 404 Handler for unmatched routes
app.use(notFound);

// 6. Global Centralized Error Handler
app.use(errorHandler);

module.exports = app;
