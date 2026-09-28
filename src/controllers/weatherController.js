const { fetchWeather } = require('../services/weatherService');

// @desc    Get current weather for a city
// @route   GET /api/weather/:city or GET /api/weather?city=cityName
// @access  Public
const getWeather = async (req, res) => {
  try {
    const rawCity = req.params.city || req.query.city || req.query.q;

    if (!rawCity || typeof rawCity !== 'string' || rawCity.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a city name (e.g., /api/weather/:city or /api/weather?city=cityName)'
      });
    }

    const city = rawCity.trim();
    const weatherData = await fetchWeather(city);

    return res.json({
      success: true,
      data: weatherData
    });
  } catch (error) {
    const requestedCity = req.params.city || req.query.city || req.query.q || '';

    if (error.message === 'City not found') {
      return res.status(404).json({
        success: false,
        message: `City '${requestedCity}' not found`
      });
    }

    if (error.message === 'WEATHER_API_KEY_MISSING') {
      return res.status(503).json({
        success: false,
        message: 'Weather service is not configured. Please set a valid WEATHER_API_KEY in .env (obtainable from https://openweathermap.org/api)'
      });
    }

    if (error.message === 'WEATHER_API_KEY_INVALID') {
      return res.status(502).json({
        success: false,
        message: 'External weather service authentication failed. The configured WEATHER_API_KEY in .env is invalid or unauthorized.'
      });
    }

    console.error('Error in getWeather controller:', error.message);
    return res.status(502).json({
      success: false,
      message: 'Failed to fetch weather data from external service'
    });
  }
};

module.exports = {
  getWeather
};
