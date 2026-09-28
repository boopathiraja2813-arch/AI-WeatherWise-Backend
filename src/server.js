const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

// Initialize DB and start HTTP server
(async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error('[Server] Unexpected DB error during startup:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`[Server] AI WeatherWise API running on port ${PORT}`);
    console.log(`[Server] Base URL: http://localhost:${PORT}`);
  });
})();
