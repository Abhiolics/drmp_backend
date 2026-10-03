const mongoose = require('mongoose');

let cachedConnection = null;

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn('[MongoDB] Warning: MONGO_URI environment variable is not set. Please add it to your Vercel Project Settings.');
    return null;
  }

  // If connection is already open, reuse it (prevents connection leaks in serverless)
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    cachedConnection = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    console.log(`[MongoDB] Connected: ${cachedConnection.connection.host}/${cachedConnection.connection.name}`);
    return cachedConnection;
  } catch (error) {
    cachedConnection = null;
    console.error(`[MongoDB] Connection Error: ${error.message}`);
    console.error(`[MongoDB] TIP: If hosted on Vercel, ensure MongoDB Atlas Network Access has IP 0.0.0.0/0 allowed.`);
    // Do not crash the entire serverless container in Vercel
    if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
      process.exit(1);
    }
    throw error;
  }
};

module.exports = connectDB;
