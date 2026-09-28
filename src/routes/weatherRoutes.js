const express = require('express');
const router = express.Router();
const { getWeather } = require('../controllers/weatherController');

// Support both /api/weather?city=London and /api/weather/London
router.get('/', getWeather);
router.get('/:city', getWeather);

module.exports = router;
