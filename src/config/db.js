const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/weatherwise';
  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000, // Quick timeout if Mongo is not running locally
    });
    isConnected = true;
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    isConnected = false;
    console.warn(`[MongoDB] Warning: Could not connect to MongoDB at ${mongoURI}`);
    console.warn(`[MongoDB] Reason: ${error.message}`);
    console.warn('[MongoDB] Database-dependent features (auth, favorites) will require MongoDB.');
    console.warn('[MongoDB] Set MONGO_URI in your .env file to a running MongoDB or MongoDB Atlas instance.');
    return null;
  }
};

const getDBStatus = () => {
  return {
    isConnected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host || null,
  };
};

module.exports = { connectDB, getDBStatus };
