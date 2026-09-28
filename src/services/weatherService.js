const isPlaceholderKey = (key) => {
  if (!key || typeof key !== 'string') return true;
  const trimmed = key.trim().toLowerCase();
  return (
    trimmed === '' ||
    trimmed.includes('your_') ||
    trimmed.includes('placeholder') ||
    trimmed === 'changeme'
  );
};

/**
 * Helper to generate deterministic mock data if explicitly enabled for testing
 */
const getMockWeather = (city) => {
  const normalizedCity = city.trim();
  const hash = normalizedCity.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Clear', 'Windy'];
  
  const condition = conditions[hash % conditions.length];
  const temperature = Math.round(15 + (hash % 20)); // 15 to 34 C
  const humidity = Math.round(40 + (hash % 50));    // 40 to 89%
  const windSpeed = Math.round((3 + (hash % 15)) * 10) / 10; // 3 to 17 m/s
  
  return {
    city: normalizedCity.charAt(0).toUpperCase() + normalizedCity.slice(1),
    temperature,
    humidity,
    windSpeed,
    condition,
    isMock: true
  };
};

/**
 * Fetch weather from OpenWeatherMap external service
 */
const fetchWeather = async (city) => {
  const apiKey = process.env.WEATHER_API_KEY || process.env.OPENWEATHER_API_KEY;

  // Check if API Key is configured
  if (isPlaceholderKey(apiKey)) {
    if (process.env.ENABLE_WEATHER_MOCK === 'true') {
      console.log(`[WeatherService] ENABLE_WEATHER_MOCK=true: returning mock weather for '${city}'`);
      return getMockWeather(city);
    }
    throw new Error('WEATHER_API_KEY_MISSING');
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('WEATHER_API_KEY_INVALID');
      }
      if (response.status === 404) {
        throw new Error('City not found');
      }
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to fetch weather data from external service');
    }

    const data = await response.json();
    return {
      city: data.name,
      temperature: data.main.temp,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      condition: data.weather && data.weather[0] ? data.weather[0].main : 'Clear',
      isMock: false
    };
  } catch (error) {
    if (error.message === 'City not found' || error.message.startsWith('WEATHER_API_KEY')) {
      throw error;
    }
    throw new Error(`External weather service error: ${error.message}`);
  }
};

module.exports = {
  fetchWeather,
  getMockWeather,
};
