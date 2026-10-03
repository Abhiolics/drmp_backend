require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const seedInitialData = require('./utils/seedData');

const PORT = process.env.PORT || 5003;

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();
    await seedInitialData();

    const server = app.listen(PORT, () => {
      console.log(`=============================================`);
      console.log(`🚀 DreamPay (DRMP) Backend Server running on port ${PORT}`);
      console.log(`🌐 Base URL: http://localhost:${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
      console.log(`=============================================`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error(`Unhandled Rejection Error: ${err.message}`);
      if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
        server.close(() => process.exit(1));
      }
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
      process.exit(1);
    }
  }
};

// If in serverless (Vercel), connect DB on function container start
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  connectDB()
    .then(() => seedInitialData())
    .catch((err) => console.error('[Vercel Boot] Init error:', err.message));
} else {
  // Standalone server mode
  startServer();
}

module.exports = app;
