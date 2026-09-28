const { GoogleGenerativeAI } = require('@google/generative-ai');

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

const generateLocalSummary = (city, temperature, humidity, condition) => {
  const tempWord = temperature >= 30 ? 'warm' : temperature <= 15 ? 'chilly' : 'pleasant';
  const humidityWord = humidity >= 70 ? 'high' : humidity <= 40 ? 'low' : 'moderate';
  return `Today's weather in ${city} is ${tempWord} and ${condition.toLowerCase()} with ${humidityWord} humidity.`;
};

const generateLocalRecommendation = (temperature, condition) => {
  const recs = [];
  const condLower = condition.toLowerCase();

  if (temperature >= 30) {
    recs.push('stay hydrated');
    recs.push('wear light cotton clothes');
    if (condLower.includes('sunny') || condLower.includes('clear')) {
      recs.push('avoid outdoor activities during peak afternoon hours');
    }
  } else if (temperature <= 15) {
    recs.push('wear warm layers');
    recs.push('keep hot drinks nearby');
  } else {
    recs.push('enjoy the comfortable temperature');
    recs.push('great day for outdoor plans');
  }

  if (condLower.includes('rain') || condLower.includes('drizzle') || condLower.includes('thunderstorm')) {
    recs.push('remember to carry an umbrella or raincoat');
  } else if (condLower.includes('cloud') || condLower.includes('overcast')) {
    recs.push('a light jacket might be handy');
  } else if (condLower.includes('snow')) {
    recs.push('watch out for slippery roads and stay warm');
  }

  if (recs.length === 0) {
    recs.push('dress comfortably for the current conditions');
  }

  // Combine recommendations list into a sentence
  const sentence = recs.slice(0, -1).join(', ') + (recs.length > 1 ? ', and ' : '') + recs.slice(-1);
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
};

const withTimeout = (promise, ms = 10000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms))
  ]);
};

/**
 * Helper to call Gemini with candidate models and resilient fallback
 */
const callGemini = async (apiKey, prompt) => {
  const genAI = new GoogleGenerativeAI(apiKey.trim());
  const candidateModels = [
    process.env.GEMINI_MODEL,
    'gemini-3.6-flash',
    'gemini-3-flash-preview',
    'gemma-4-26b-a4b-it'
  ].filter(Boolean);

  // Eliminate duplicates
  const uniqueModels = [...new Set(candidateModels)];

  for (const modelName of uniqueModels) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await withTimeout(model.generateContent(prompt), 12000);
      const response = await result.response;
      const text = response.text().trim();
      if (text) {
        return text;
      }
    } catch (err) {
      // Continue to next model if model is deprecated (404), unavailable/busy (503), timed out, or rate-limited (429)
      const sanitizedMsg = (err.message || '').replace(apiKey, '[PROTECTED]');
      // If last candidate fails, it will exit loop and return null
    }
  }
  return null;
};

/**
 * Generate AI Summary
 */
const generateSummary = async (city, temperature, humidity, condition) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (process.env.ENABLE_WEATHER_MOCK === 'true' || isPlaceholderKey(apiKey)) {
    return generateLocalSummary(city, temperature, humidity, condition);
  }

  try {
    const prompt = `Generate a concise weather summary (maximum 1-2 sentences) for the following weather conditions:
City: ${city}
Temperature: ${temperature}°C
Humidity: ${humidity}%
Condition: ${condition}

Response format should be simple, natural, and directly describe the current feel. Do not include markdown formatting.`;

    const aiText = await callGemini(apiKey, prompt);
    return aiText || generateLocalSummary(city, temperature, humidity, condition);
  } catch (error) {
    return generateLocalSummary(city, temperature, humidity, condition);
  }
};

/**
 * Generate AI Recommendation
 */
const generateRecommendation = async (temperature, condition) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (process.env.ENABLE_WEATHER_MOCK === 'true' || isPlaceholderKey(apiKey)) {
    return generateLocalRecommendation(temperature, condition);
  }

  try {
    const prompt = `Provide actionable personalized recommendations (maximum 1-2 sentences, e.g., clothing, hydration, activities) based on these weather conditions:
Temperature: ${temperature}°C
Condition: ${condition}

Response format should be natural, friendly, and practical. Do not include markdown formatting.`;

    const aiText = await callGemini(apiKey, prompt);
    return aiText || generateLocalRecommendation(temperature, condition);
  } catch (error) {
    return generateLocalRecommendation(temperature, condition);
  }
};

module.exports = {
  generateSummary,
  generateRecommendation,
};
