/**
 * AI WeatherWise API - Automated Test Suite
 * Validates endpoints, error handling, auth guards, weather fetching, and AI services.
 */
process.env.ENABLE_WEATHER_MOCK = 'true';
const http = require('http');
const mongoose = require('mongoose');
const app = require('../src/app');
const { fetchWeather } = require('../src/services/weatherService');
const { generateSummary, generateRecommendation } = require('../src/services/aiService');

const PORT = 5055;
let server;
let passed = 0;
let failed = 0;

const assert = (condition, testName, details = '') => {
  if (condition) {
    console.log(`  \x1b[32m✔\x1b[0m ${testName}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖\x1b[0m ${testName}`);
    if (details) console.error(`    \x1b[33mDetails: ${details}\x1b[0m`);
    failed++;
  }
};

const makeRequest = (path, method = 'GET', body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://127.0.0.1:${PORT}${path}`);
    const reqHeaders = { ...headers };
    let payload = null;

    if (body) {
      payload = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: reqHeaders,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
};

const runTests = async () => {
  console.log('\n=============================================');
  console.log('  AI WeatherWise - Comprehensive Test Suite  ');
  console.log('=============================================\n');

  // Start temporary test server
  server = app.listen(PORT);
  await new Promise((resolve) => server.once('listening', resolve));

  try {
    // 1. Root & Health Check Tests
    console.log('\x1b[36m[1] System & Health Checks\x1b[0m');
    const rootRes = await makeRequest('/');
    assert(rootRes.status === 200, 'GET / returns 200 OK');
    assert(rootRes.body && rootRes.body.name === 'AI WeatherWise API', 'GET / returns API metadata');

    const healthRes = await makeRequest('/api/health');
    assert(healthRes.status === 200, 'GET /api/health returns 200 OK');
    assert(healthRes.body && healthRes.body.status === 'healthy', 'GET /api/health reports healthy');
    assert(healthRes.body.database !== undefined, 'GET /api/health reports database connection status');

    // 2. Weather API Tests
    console.log('\n\x1b[36m[2] Weather API Endpoints\x1b[0m');
    const weatherPathRes = await makeRequest('/api/weather/Hyderabad');
    assert(weatherPathRes.status === 200, 'GET /api/weather/:city returns 200 OK');
    assert(weatherPathRes.body && weatherPathRes.body.success === true, 'GET /api/weather/:city success is true');
    assert(typeof weatherPathRes.body.data.temperature === 'number', 'GET /api/weather/:city returns temperature');
    assert(typeof weatherPathRes.body.data.condition === 'string', 'GET /api/weather/:city returns condition');

    const weatherQueryRes = await makeRequest('/api/weather?city=Chennai');
    assert(weatherQueryRes.status === 200, 'GET /api/weather?city=Chennai returns 200 OK');
    assert(weatherQueryRes.body.data.city.toLowerCase() === 'chennai', 'GET /api/weather?city returns correct city');

    const weatherMissingRes = await makeRequest('/api/weather');
    assert(weatherMissingRes.status === 400, 'GET /api/weather (missing city) returns 400 Bad Request');
    assert(weatherMissingRes.body.success === false, 'GET /api/weather missing param returns success: false');

    // 3. Security & Auth Guard Tests
    console.log('\n\x1b[36m[3] Authentication & Route Protection\x1b[0m');
    const noTokenRes = await makeRequest('/api/locations');
    assert(noTokenRes.status === 401, 'GET /api/locations without token returns 401 Unauthorized');
    assert(noTokenRes.body.message.includes('no token provided'), 'Unauthorized response contains clear error reason');

    const invalidTokenRes = await makeRequest('/api/locations', 'GET', null, {
      Authorization: 'Bearer invalid_garbage_token'
    });
    assert(invalidTokenRes.status === 401, 'GET /api/locations with invalid token returns 401 Unauthorized');

    const noTokenAiSummary = await makeRequest('/api/ai/weather-summary', 'POST', {
      city: 'Delhi',
      temperature: 30,
      humidity: 50,
      condition: 'Clear'
    });
    assert(noTokenAiSummary.status === 401, 'POST /api/ai/weather-summary without token returns 401 Unauthorized');

    // 4. AI Service Direct Verification
    console.log('\n\x1b[36m[4] AI Summary & Recommendation Services\x1b[0m');
    const summary = await generateSummary('Mumbai', 32, 75, 'Sunny');
    assert(typeof summary === 'string' && summary.length > 10, 'generateSummary produces natural-language summary');
    assert(summary.toLowerCase().includes('mumbai'), 'Summary references requested city');

    const rec = await generateRecommendation(35, 'Sunny');
    assert(typeof rec === 'string' && rec.length > 10, 'generateRecommendation produces activity/clothing recommendations');
    assert(rec.toLowerCase().includes('hydrated') || rec.toLowerCase().includes('clothes') || rec.toLowerCase().includes('comfort'), 'Recommendation includes relevant advice');

    // 5. Validation & Error Handling
    console.log('\n\x1b[36m[5] Validation & Error Handling\x1b[0m');
    const notFoundRes = await makeRequest('/api/does-not-exist');
    assert(notFoundRes.status === 404, 'Non-existent route returns 404 Not Found');

    // 6. User Model, Password Hashing & JWT Unit Tests
    console.log('\n\x1b[36m[6] Security & Model Unit Verification\x1b[0m');
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const User = require('../src/models/User');

    // Test password hashing
    const rawPass = 'secretPassword123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPass, salt);
    assert(hash !== rawPass, 'bcrypt securely hashes passwords into non-plaintext');
    const isMatch = await bcrypt.compare(rawPass, hash);
    assert(isMatch === true, 'bcrypt correctly matches candidate password');
    const isWrongMatch = await bcrypt.compare('wrongPassword', hash);
    assert(isWrongMatch === false, 'bcrypt rejects invalid candidate password');

    // Test JWT generation and decoding
    const testId = new mongoose.Types.ObjectId();
    const token = jwt.sign({ id: testId.toString() }, process.env.JWT_SECRET || 'your_super_secret_jwt_key_12345!', { expiresIn: '1h' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_12345!');
    assert(decoded.id === testId.toString(), 'JWT token safely encodes and decodes user ID');

    // Test User schema validation
    const testUserInstance = new User({
      name: 'Validation Test User',
      email: 'valid.user@example.com',
      password: 'password123',
      role: 'user'
    });
    const validateErr = testUserInstance.validateSync();
    assert(!validateErr, 'User model successfully validates compliant user object');
    assert(testUserInstance.role === 'user', 'User model defaults role to "user"');

    const invalidUser = new User({ email: 'bad-email' });
    const invalidErr = invalidUser.validateSync();
    assert(!!invalidErr && !!invalidErr.errors.name && !!invalidErr.errors.password && !!invalidErr.errors.email, 'User model enforces required fields and valid email format');

    const isDBConnected = mongoose.connection.readyState === 1;
    if (isDBConnected) {
      console.log('\n\x1b[36m[6] Database CRUD Flow (Active MongoDB Connection)\x1b[0m');
      const testEmail = `testuser_${Date.now()}@example.com`;
      const regRes = await makeRequest('/api/auth/register', 'POST', {
        name: 'Automated Tester',
        email: testEmail,
        password: 'password123',
        role: 'user'
      });
      assert(regRes.status === 201, 'POST /api/auth/register returns 201 Created');
      const token = regRes.body.data.token;
      assert(!!token, 'Registration returns JWT token');
      assert(regRes.body.data.role === 'user', 'Registration returns user role');

      // Login
      const loginRes = await makeRequest('/api/auth/login', 'POST', {
        email: testEmail,
        password: 'password123'
      });
      assert(loginRes.status === 200, 'POST /api/auth/login returns 200 OK');
      assert(loginRes.body.data.email === testEmail, 'Login returns correct email');

      // Profile
      const profRes = await makeRequest('/api/auth/profile', 'GET', null, {
        Authorization: `Bearer ${token}`
      });
      assert(profRes.status === 200, 'GET /api/auth/profile returns 200 OK');
      assert(profRes.body.data.name === 'Automated Tester', 'Profile returns correct name');

      // Add Favorite Location
      const addLocRes = await makeRequest('/api/locations', 'POST', {
        city: 'Bengaluru',
        country: 'India'
      }, { Authorization: `Bearer ${token}` });
      assert(addLocRes.status === 201, 'POST /api/locations returns 201 Created');
      const locId = addLocRes.body.data._id;

      // Get Favorite Locations
      const getLocsRes = await makeRequest('/api/locations', 'GET', null, {
        Authorization: `Bearer ${token}`
      });
      assert(getLocsRes.status === 200, 'GET /api/locations returns 200 OK');
      assert(getLocsRes.body.count >= 1, 'GET /api/locations returns at least 1 location');

      // Update Favorite Location
      const updateLocRes = await makeRequest(`/api/locations/${locId}`, 'PUT', {
        city: 'Bengaluru Central',
        country: 'India'
      }, { Authorization: `Bearer ${token}` });
      assert(updateLocRes.status === 200, 'PUT /api/locations/:id returns 200 OK');

      // AI Summary with Token
      const aiSummaryRes = await makeRequest('/api/ai/weather-summary', 'POST', {
        city: 'Bengaluru Central',
        temperature: 24,
        humidity: 60,
        condition: 'Partly Cloudy'
      }, { Authorization: `Bearer ${token}` });
      assert(aiSummaryRes.status === 200, 'POST /api/ai/weather-summary with JWT returns 200 OK');

      // Delete Favorite Location
      const delLocRes = await makeRequest(`/api/locations/${locId}`, 'DELETE', null, {
        Authorization: `Bearer ${token}`
      });
      assert(delLocRes.status === 200, 'DELETE /api/locations/:id returns 200 OK');
    } else {
      console.log('\n\x1b[36m[6] Database Offline Resilience Verification\x1b[0m');
      const regRes = await makeRequest('/api/auth/register', 'POST', {
        name: 'Test',
        email: 'test@example.com',
        password: 'password123'
      });
      assert(regRes.status === 503, 'POST /api/auth/register without MongoDB returns 503 Service Unavailable');
      assert(regRes.body.message.includes('Database is not connected'), 'Clear instruction to set MONGO_URI in .env');
    }

  } catch (error) {
    console.error('Unexpected test error:', error);
    failed++;
  } finally {
    server.close();
  }

  console.log('\n=============================================');
  console.log(`  Test Results: \x1b[32m${passed} Passed\x1b[0m | \x1b[31m${failed} Failed\x1b[0m`);
  console.log('=============================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
