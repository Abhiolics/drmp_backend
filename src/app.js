const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const errorHandler = require('./middlewares/errorHandler');
const apiRoutes = require('./routes');

const app = express();

// Enable CORS
app.use(cors());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { uploadDir } = require('./middlewares/uploadMiddleware');

// Ensure DB is connected in serverless (Vercel) environments before processing requests
app.use(async (req, res, next) => {
  // Allow root, health check, and static files to serve without requiring DB
  if (req.path === '/' || req.path === '/health' || req.path.startsWith('/uploads')) {
    return next();
  }

  if (mongoose.connection.readyState < 1) {
    if (!process.env.MONGO_URI) {
      return res.status(503).json({
        success: false,
        message: 'MONGO_URI environment variable is missing in Vercel Project Settings.',
      });
    }

    try {
      await connectDB();
    } catch (err) {
      return res.status(503).json({
        success: false,
        message: 'Database connection failed. Please ensure MongoDB Atlas Network Access has 0.0.0.0/0 (Allow access from anywhere) enabled.',
        error: err.message,
      });
    }
  }
  next();
});

// Serve static uploaded files from both project directory and temporary uploads
const localUploads = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(localUploads));
if (uploadDir && uploadDir !== localUploads) {
  app.use('/uploads', express.static(uploadDir));
}

// Root landing endpoint
app.get('/', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    name: 'DreamPay Backend API',
    status: 'online',
    database: isDbConnected ? 'connected' : (process.env.MONGO_URI ? 'connecting' : 'not_configured'),
    version: '1.0.0',
    documentation: '/health',
    timestamp: new Date(),
  });
});

// Health check route
app.get('/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: 'OK',
    message: 'DreamPay Backend API is running smoothly',
    database: isDbConnected ? 'connected' : (process.env.MONGO_URI ? 'connecting' : 'not_configured'),
    timestamp: new Date(),
  });
});

// Mount routes on BOTH '/api' and root '/'
// This ensures 100% compatibility with any Postman base URL (with or without /api)
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

// Catch 404
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
