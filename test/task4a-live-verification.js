/**
 * Task 4A Live Weather Verification Script
 * Strictly tests real OpenWeatherMap integration without printing secrets.
 */
require('dotenv').config();

const BASE_URL = 'http://localhost:5001';

const runLiveVerification = async () => {
  console.log('======================================================');
  console.log('  TASK 4A: LIVE OPENWEATHERMAP API VERIFICATION       ');
  console.log('======================================================\n');

  const apiKey = process.env.WEATHER_API_KEY || process.env.OPENWEATHER_API_KEY;

  // --- 1. Test GET /api/weather/Chennai ---
  console.log('[1] Testing GET /api/weather/Chennai (Live OpenWeatherMap)');
  const chennaiRes = await fetch(`${BASE_URL}/api/weather/Chennai`);
  const chennaiData = await chennaiRes.json();

  console.log('Chennai HTTP Status:', chennaiRes.status);
  console.log('Chennai Response Payload:');
  console.log(JSON.stringify(chennaiData, null, 2));

  if (chennaiRes.status !== 200 || !chennaiData.success || !chennaiData.data) {
    throw new Error(`FAIL: Chennai weather request failed with status ${chennaiRes.status}: ${JSON.stringify(chennaiData)}`);
  }
  if (chennaiData.data.isMock === true) {
    throw new Error('FAIL: Returned mock weather data instead of live OpenWeatherMap data!');
  }
  console.log('✔ Real live weather data received for Chennai from OpenWeatherMap (isMock === false).\n');

  // --- 2. Test GET /api/weather/Mumbai ---
  console.log('[2] Testing GET /api/weather/Mumbai (City-Specific Live Data)');
  const mumbaiRes = await fetch(`${BASE_URL}/api/weather/Mumbai`);
  const mumbaiData = await mumbaiRes.json();

  console.log('Mumbai HTTP Status:', mumbaiRes.status);
  console.log('Mumbai Response Payload:');
  console.log(JSON.stringify(mumbaiData, null, 2));

  if (mumbaiRes.status !== 200 || !mumbaiData.success || !mumbaiData.data) {
    throw new Error(`FAIL: Mumbai weather request failed with status ${mumbaiRes.status}`);
  }
  if (mumbaiData.data.isMock === true) {
    throw new Error('FAIL: Returned mock weather data for Mumbai!');
  }
  if (mumbaiData.data.city.toLowerCase() !== 'mumbai') {
    throw new Error(`FAIL: Returned city '${mumbaiData.data.city}' does not match requested Mumbai!`);
  }
  console.log('✔ City-specific live weather received for Mumbai.\n');

  // --- 3. Test Invalid City ---
  console.log('[3] Testing Invalid / Non-Existent City (GET /api/weather/nonexistent_xyz_city_999)');
  const invalidRes = await fetch(`${BASE_URL}/api/weather/nonexistent_xyz_city_999`);
  const invalidData = await invalidRes.json();

  console.log('Invalid City HTTP Status:', invalidRes.status);
  console.log('Invalid City Response:', invalidData);

  if (invalidRes.status !== 404 || invalidData.success !== false) {
    throw new Error(`FAIL: Invalid city did not return 404 Not Found! Got ${invalidRes.status}`);
  }
  console.log('✔ Invalid city correctly returned 404 Not Found from OpenWeatherMap.\n');

  // --- 4. Test Missing City ---
  console.log('[4] Testing Missing City Parameter (GET /api/weather)');
  const missingRes = await fetch(`${BASE_URL}/api/weather`);
  const missingData = await missingRes.json();

  console.log('Missing City HTTP Status:', missingRes.status);
  console.log('Missing City Response:', missingData);

  if (missingRes.status !== 400 || missingData.success !== false) {
    throw new Error(`FAIL: Missing city did not return 400 Bad Request! Got ${missingRes.status}`);
  }
  console.log('✔ Missing city correctly returned 400 Bad Request.\n');

  // --- 5. Test Whitespace-Only City Input ---
  console.log('[5] Testing Whitespace-Only City (GET /api/weather?city=%20%20%20)');
  const whitespaceRes = await fetch(`${BASE_URL}/api/weather?city=%20%20%20`);
  const whitespaceData = await whitespaceRes.json();

  console.log('Whitespace City HTTP Status:', whitespaceRes.status);
  console.log('Whitespace City Response:', whitespaceData);

  if (whitespaceRes.status !== 400 || whitespaceData.success !== false) {
    throw new Error(`FAIL: Whitespace city did not return 400 Bad Request! Got ${whitespaceRes.status}`);
  }
  console.log('✔ Whitespace-only city correctly returned 400 Bad Request.\n');

  // --- 6. Test GET /api/health ---
  console.log('[6] Testing Health Endpoint Post-Verification (GET /api/health)');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthData = await healthRes.json();

  console.log('Health Endpoint HTTP Status:', healthRes.status);
  console.log('Health Response:', healthData);

  if (healthRes.status !== 200 || !healthData.status || healthData.status !== 'healthy') {
    throw new Error('FAIL: Health check failed after running weather tests!');
  }
  console.log('✔ Server and database remain active, healthy, and responsive.\n');

  // --- 7. Secret Leakage Audit ---
  console.log('[7] Auditing All Responses for Secret Protection');
  const allPayloads = [
    JSON.stringify(chennaiData),
    JSON.stringify(mumbaiData),
    JSON.stringify(invalidData),
    JSON.stringify(missingData),
    JSON.stringify(whitespaceData),
    JSON.stringify(healthData)
  ].join(' ');

  if (apiKey && apiKey.length >= 10 && allPayloads.includes(apiKey)) {
    throw new Error('SECURITY VULNERABILITY: API key was found in HTTP responses!');
  }
  console.log('✔ Secret protection verified: API key is completely absent from all responses.\n');

  console.log('======================================================');
  console.log('  ALL TASK 4A LIVE VERIFICATION CHECKS PASSED!        ');
  console.log('======================================================\n');
};

runLiveVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err.message);
  process.exit(1);
});
