const { generateSummary, generateRecommendation } = require('../services/aiService');
const { fetchWeather } = require('../services/weatherService');

// @desc    Generate AI Weather Summary
// @route   POST /api/ai/weather-summary
// @access  Private
const getWeatherSummary = async (req, res) => {
  try {
    let { city, temperature, humidity, condition } = req.body;

    if (!city && temperature === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either a city name or weather details (city, temperature, humidity, condition)'
      });
    }

    // If city is provided but metrics are missing, auto-fetch weather data
    if (city && (temperature === undefined || humidity === undefined || !condition)) {
      try {
        const weather = await fetchWeather(city);
        temperature = weather.temperature;
        humidity = weather.humidity;
        condition = weather.condition;
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: `Could not fetch weather metrics for '${city}'. Please provide temperature, humidity, and condition.`
        });
      }
    }

    if (temperature === undefined || humidity === undefined || !condition) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all fields: city, temperature, humidity, and condition'
      });
    }

    const summary = await generateSummary(city || 'Local Area', Number(temperature), Number(humidity), condition);

    return res.json({
      success: true,
      data: {
        city: city || 'Local Area',
        temperature: Number(temperature),
        humidity: Number(humidity),
        condition,
        summary
      },
      summary // Preserve top-level key for backward compatibility
    });
  } catch (error) {
    console.error('Error in getWeatherSummary:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while generating weather summary'
    });
  }
};

// @desc    Generate AI Weather Recommendations
// @route   POST /api/ai/weather-recommendation
// @access  Private
const getWeatherRecommendation = async (req, res) => {
  try {
    let { city, temperature, condition } = req.body;

    // If city is provided but metrics are missing, auto-fetch weather data
    if (city && (temperature === undefined || !condition)) {
      try {
        const weather = await fetchWeather(city);
        temperature = weather.temperature;
        condition = weather.condition;
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: `Could not fetch weather metrics for '${city}'. Please provide temperature and condition.`
        });
      }
    }

    if (temperature === undefined || !condition) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all fields: temperature and condition (or provide city)'
      });
    }

    const recommendation = await generateRecommendation(Number(temperature), condition);

    return res.json({
      success: true,
      data: {
        temperature: Number(temperature),
        condition,
        recommendation
      },
      recommendation // Preserve top-level key for backward compatibility
    });
  } catch (error) {
    console.error('Error in getWeatherRecommendation:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while generating weather recommendations'
    });
  }
};

module.exports = {
  getWeatherSummary,
  getWeatherRecommendation
};
