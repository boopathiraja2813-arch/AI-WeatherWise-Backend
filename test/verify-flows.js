/**
 * Functional verification script testing all 11 flows on live backend
 */
const BASE_URL = 'http://localhost:5001';

const testFlows = async () => {
  const results = {};

  const makeReq = async (endpoint, method = 'GET', body = null, headers = {}) => {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${BASE_URL}${endpoint}`, opts);
    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = await res.text();
    }
    return { status: res.status, data };
  };

  console.log('--- EXECUTING VERIFICATION ON LIVE SERVER ---');

  // 1. Health/server check
  console.log('\n[Flow 1] Health / Server Check');
  const healthRes = await makeReq('/api/health');
  console.log('Status:', healthRes.status);
  console.log('Response:', JSON.stringify(healthRes.data, null, 2));
  results.flow1 = healthRes;

  // 2. User registration
  console.log('\n[Flow 2] User Registration');
  const regRes = await makeReq('/api/auth/register', 'POST', {
    name: 'Verification User',
    email: 'verify@example.com',
    password: 'password123',
    role: 'user',
  });
  console.log('Status:', regRes.status);
  console.log('Response:', JSON.stringify(regRes.data, null, 2));
  results.flow2 = regRes;

  // 3. User login
  console.log('\n[Flow 3] User Login');
  const loginRes = await makeReq('/api/auth/login', 'POST', {
    email: 'verify@example.com',
    password: 'password123',
  });
  console.log('Status:', loginRes.status);
  console.log('Response:', JSON.stringify(loginRes.data, null, 2));
  results.flow3 = loginRes;

  // 4. JWT authentication (Generate test token to test auth middleware)
  console.log('\n[Flow 4] JWT Authentication');
  const jwt = require('jsonwebtoken');
  const mongoose = require('mongoose');
  const fakeUserId = new mongoose.Types.ObjectId().toString();
  const testToken = jwt.sign({ id: fakeUserId }, process.env.JWT_SECRET || 'your_super_secret_jwt_key_12345!', { expiresIn: '1h' });

  const jwtProfileRes = await makeReq('/api/auth/profile', 'GET', null, {
    Authorization: `Bearer ${testToken}`,
  });
  console.log('Profile with JWT Status:', jwtProfileRes.status);
  console.log('Response:', JSON.stringify(jwtProfileRes.data, null, 2));
  results.flow4 = jwtProfileRes;

  // 5. Protected API access (without token vs with token)
  console.log('\n[Flow 5] Protected API Access');
  const protectedNoToken = await makeReq('/api/locations');
  console.log('Without Token Status:', protectedNoToken.status);
  console.log('Response:', JSON.stringify(protectedNoToken.data, null, 2));

  const protectedWithToken = await makeReq('/api/locations', 'GET', null, {
    Authorization: `Bearer ${testToken}`,
  });
  console.log('With Token Status:', protectedWithToken.status);
  console.log('Response:', JSON.stringify(protectedWithToken.data, null, 2));
  results.flow5 = { noToken: protectedNoToken, withToken: protectedWithToken };

  // 6. Add favorite location
  console.log('\n[Flow 6] Add Favorite Location');
  const addLocRes = await makeReq('/api/locations', 'POST', {
    city: 'Hyderabad',
    country: 'India',
  }, {
    Authorization: `Bearer ${testToken}`,
  });
  console.log('Status:', addLocRes.status);
  console.log('Response:', JSON.stringify(addLocRes.data, null, 2));
  results.flow6 = addLocRes;

  // 7. Get favorite locations
  console.log('\n[Flow 7] Get Favorite Locations');
  const getLocRes = await makeReq('/api/locations', 'GET', null, {
    Authorization: `Bearer ${testToken}`,
  });
  console.log('Status:', getLocRes.status);
  console.log('Response:', JSON.stringify(getLocRes.data, null, 2));
  results.flow7 = getLocRes;

  // 8. Delete favorite location
  console.log('\n[Flow 8] Delete Favorite Location');
  const delLocRes = await makeReq('/api/locations/65f123456789012345678901', 'DELETE', null, {
    Authorization: `Bearer ${testToken}`,
  });
  console.log('Status:', delLocRes.status);
  console.log('Response:', JSON.stringify(delLocRes.data, null, 2));
  results.flow8 = delLocRes;

  // 9. Weather API
  console.log('\n[Flow 9] Weather API');
  const weatherRes = await makeReq('/api/weather/Hyderabad');
  console.log('Status:', weatherRes.status);
  console.log('Response:', JSON.stringify(weatherRes.data, null, 2));
  results.flow9 = weatherRes;

  // 10. Gemini AI weather recommendation
  console.log('\n[Flow 10] Gemini AI Weather Recommendation');
  // Need to bypass protect or use testToken (protect will return 503 if DB is disconnected!)
  // Notice protect middleware requires DB to find user!
  const aiRecRes = await makeReq('/api/ai/weather-recommendation', 'POST', {
    temperature: 32,
    condition: 'Sunny',
  }, {
    Authorization: `Bearer ${testToken}`,
  });
  console.log('Status:', aiRecRes.status);
  console.log('Response:', JSON.stringify(aiRecRes.data, null, 2));
  results.flow10 = aiRecRes;

  // 11. Error handling
  console.log('\n[Flow 11] Error Handling');
  const errMissingParam = await makeReq('/api/weather');
  console.log('Missing Weather Param Status:', errMissingParam.status);
  console.log('Response:', JSON.stringify(errMissingParam.data, null, 2));

  const errRoute404 = await makeReq('/api/does-not-exist');
  console.log('Route 404 Status:', errRoute404.status);
  console.log('Response:', JSON.stringify(errRoute404.data, null, 2));

  const errInvalidToken = await makeReq('/api/locations', 'GET', null, {
    Authorization: 'Bearer malformed.token.value',
  });
  console.log('Invalid Token Status:', errInvalidToken.status);
  console.log('Response:', JSON.stringify(errInvalidToken.data, null, 2));
  results.flow11 = { errMissingParam, errRoute404, errInvalidToken };

  console.log('\n--- VERIFICATION COMPLETED ---');
};

testFlows().catch(console.error);
