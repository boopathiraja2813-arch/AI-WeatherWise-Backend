const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { getDBStatus } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const locationRoutes = require('./routes/locationRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// API Base Route
app.get('/', (req, res) => {
  res.json({
    name: 'AI WeatherWise API',
    version: '1.0.0',
    description: 'RESTful Weather API with Authentication and AI-Powered Recommendations',
    health: '/api/health',
    endpoints: {
      auth: '/api/auth (register, login, profile)',
      locations: '/api/locations (CRUD favorite cities)',
      weather: '/api/weather/:city (current weather)',
      ai: '/api/ai (weather-summary, weather-recommendation)'
    },
    documentation: 'See README.md or import postman_collection.json'
  });
});

// Health Check Endpoint
app.get(['/api/health', '/health'], (req, res) => {
  const dbStatus = getDBStatus();
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'AI WeatherWise API',
    database: {
      connected: dbStatus.isConnected,
      status: dbStatus.isConnected ? 'connected' : 'disconnected'
    },
    version: '1.0.0'
  });
});

// Routing Registry
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/ai', aiRoutes);

// 404 Route Not Found Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;
