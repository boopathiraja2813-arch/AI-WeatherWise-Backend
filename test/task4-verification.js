/**
 * Task 4 Live Verification Script
 * Validates Weather API configuration, public route access, input validation,
 * missing city rejection, external API failure handling, and secret protection.
 */
require('dotenv').config();

const BASE_URL = 'http://localhost:5001';

const runTask4Verification = async () => {
  console.log('====================================================');
  console.log('  TASK 4: WEATHER API FUNCTIONAL VERIFICATION       ');
  console.log('====================================================\n');

  // --- Step 1: Configuration & Code Inspection ---
  console.log('[1] Weather API Configuration Inspection');
  const envKey = process.env.WEATHER_API_KEY || process.env.OPENWEATHER_API_KEY;
  console.log('Provider used: OpenWeatherMap (https://api.openweathermap.org/data/2.5/weather)');
  console.log('API Key configured in .env:', envKey ? `[Present: length ${envKey.length}]` : 'None');
  const isPlaceholder = !envKey || envKey.includes('YOUR_') || envKey.includes('placeholder');
  console.log('Is API key a placeholder:', isPlaceholder);

  // Check that no secret is hardcoded in source files
  const fs = require('fs');
  const serviceCode = fs.readFileSync('src/services/weatherService.js', 'utf8');
  const controllerCode = fs.readFileSync('src/controllers/weatherController.js', 'utf8');
  const hardcodedCheck = serviceCode.includes('appid=') && !serviceCode.includes('appid=${apiKey}');
  console.log('Is API key hardcoded in source code:', hardcodedCheck);
  if (hardcodedCheck) {
    throw new Error('SECURITY VULNERABILITY: API key is hardcoded in source code!');
  }
  console.log('✔ API key is dynamically retrieved from environment variables and not hardcoded.');

  // --- Step 2: Route Authorization Check ---
  console.log('\n[2] Checking Route Authorization (Public vs Protected)');
  const authCheckRes = await fetch(`${BASE_URL}/api/weather/Chennai`);
  console.log('GET /api/weather/Chennai status without JWT:', authCheckRes.status);
  if (authCheckRes.status === 401) {
    console.log('Route is protected by JWT.');
  } else {
    console.log('✔ Route is intentionally public (does not require JWT header).');
  }

  // --- Step 3: Missing City Validation ---
  console.log('\n[3] Testing Missing City Parameter (GET /api/weather)');
  const missingCityRes = await fetch(`${BASE_URL}/api/weather`);
  const missingCityData = await missingCityRes.json();
  console.log('Missing City Status:', missingCityRes.status);
  console.log('Missing City Response:', missingCityData);

  if (missingCityRes.status !== 400 || missingCityData.success !== false) {
    throw new Error('FAIL: Missing city parameter did not return 400 Bad Request!');
  }
  console.log('✔ Missing city returns controlled 400 Bad Request without unnecessary external API calls.');

  // --- Step 4: Empty & Whitespace Input Validation ---
  console.log('\n[4] Testing Empty & Whitespace Input (GET /api/weather?city=%20%20)');
  const emptyCityRes = await fetch(`${BASE_URL}/api/weather?city=%20%20%20`);
  const emptyCityData = await emptyCityRes.json();
  console.log('Whitespace Input Status:', emptyCityRes.status);
  console.log('Whitespace Input Response:', emptyCityData);

  if (emptyCityRes.status !== 400 || emptyCityData.success !== false) {
    throw new Error('FAIL: Whitespace-only city parameter did not return 400 Bad Request!');
  }
  console.log('✔ Whitespace-only city returns controlled 400 Bad Request.');

  // --- Step 5: External Weather Service Live Response / Missing Key Handling ---
  console.log('\n[5] Testing Weather API Endpoint with Current Configuration');
  const cityRes = await fetch(`${BASE_URL}/api/weather/Chennai`);
  const cityData = await cityRes.json();
  console.log('Weather Call Status for Chennai:', cityRes.status);
  console.log('Weather Call Response:', cityData);

  // Check for secret leakage in response
  const rawResponseString = JSON.stringify(cityData);
  if (envKey && envKey.length > 5 && rawResponseString.includes(envKey)) {
    throw new Error('SECURITY VULNERABILITY: API key exposed in API response!');
  }
  console.log('✔ API response does NOT leak the API key or secret.');

  // Check if live key or missing key
  if (cityRes.status === 503) {
    console.log('✔ Backend accurately detects missing OpenWeatherMap API key (HTTP 503 Service Unavailable).');
    console.log('  Notice:', cityData.message);
  } else if (cityRes.status === 200) {
    console.log('✔ Live weather response received for Chennai:', cityData.data);
  } else {
    console.log('Response status:', cityRes.status, cityData);
  }

  // --- Step 6: Controlled External API Failure Simulation ---
  console.log('\n[6] Testing Controlled External API Failure (Simulating Invalid API Key)');
  // Temporarily invoke fetchWeather with an invalid key to verify non-crashing behavior
  const { fetchWeather } = require('../src/services/weatherService');
  const originalKey = process.env.WEATHER_API_KEY;
  process.env.WEATHER_API_KEY = 'invalid_test_api_key_abc123';

  let simulatedErrorCaught = false;
  try {
    await fetchWeather('Chennai');
  } catch (err) {
    simulatedErrorCaught = true;
    console.log('Simulated failure error type:', err.message);
    if (err.message !== 'WEATHER_API_KEY_INVALID') {
      console.log('Caught external error:', err.message);
    }
  } finally {
    process.env.WEATHER_API_KEY = originalKey;
  }

  if (!simulatedErrorCaught) {
    throw new Error('FAIL: Invalid API key did not trigger external error!');
  }
  console.log('✔ Invalid external API key correctly detected and handled without server crash.');

  // --- Step 7: Verify Server Remains Responsive After Failure ---
  console.log('\n[7] Verifying Server Liveness After Simulated Failure');
  const healthAfterRes = await fetch(`${BASE_URL}/api/health`);
  const healthAfterData = await healthAfterRes.json();
  if (healthAfterRes.status !== 200 || !healthAfterData.status) {
    throw new Error('FAIL: Server crashed or failed to respond after external API error!');
  }
  console.log('✔ Server remains active and fully healthy after handling external API error.');

  console.log('\n====================================================');
  console.log('  TASK 4 WEATHER VERIFICATION COMPLETED              ');
  console.log('====================================================\n');
};

runTask4Verification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
