/**
 * Task 2 Comprehensive Live Verification Script
 * Tests live MongoDB connection, User model, Registration, Duplicate rejection,
 * Password hashing, Login, Invalid login handling, and JWT token verification.
 */
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const BASE_URL = 'http://localhost:5001';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/weatherwise';
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_12345!';

const runTask2Verification = async () => {
  console.log('====================================================');
  console.log('  TASK 2: LIVE DATABASE & AUTHENTICATION VERIFICATION');
  console.log('====================================================\n');

  // --- Step 1: Health & MongoDB Connection Check ---
  console.log('[1] Checking Live Server & Database Status via /api/health');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthData = await healthRes.json();
  console.log('Health Endpoint Status:', healthRes.status);
  console.log('Health Response:', JSON.stringify(healthData, null, 2));

  if (!healthData.database || !healthData.database.connected) {
    console.error('FAIL: Database is not connected according to /api/health');
    process.exit(1);
  }
  console.log('✔ MongoDB connection verified active via API health check.\n');

  // Direct MongoDB connection for inspecting database records
  await mongoose.connect(MONGO_URI);
  console.log('✔ Direct connection established to MongoDB:', mongoose.connection.name);
  const User = require('../src/models/User');

  // --- Step 2: User Model Schema Validation ---
  console.log('\n[2] Verifying User Model Schema');
  const schemaKeys = Object.keys(User.schema.paths);
  console.log('Schema keys:', schemaKeys);
  const hasName = !!User.schema.paths.name;
  const hasEmail = !!User.schema.paths.email;
  const hasPassword = !!User.schema.paths.password;
  const hasRole = !!User.schema.paths.role;
  const roleDefault = User.schema.paths.role.defaultValue;
  console.log('Fields verified:', { hasName, hasEmail, hasPassword, hasRole, roleDefault });

  // --- Step 3: Registration with Real Database ---
  console.log('\n[3] Testing User Registration API (Real HTTP & Real DB)');
  const uniqueId = Date.now();
  const testEmail = `weather_test_${uniqueId}@example.com`;
  const testPassword = 'TestPassword123';
  const testName = 'Weather Test User';

  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: testPassword,
    }),
  });

  const regData = await regRes.json();
  console.log('Registration HTTP Status:', regRes.status);
  console.log('Registration Response (Safe sanitized):', {
    success: regData.success,
    data: {
      _id: regData.data?._id,
      name: regData.data?.name,
      email: regData.data?.email,
      role: regData.data?.role,
      hasToken: !!regData.data?.token,
    }
  });

  if (regRes.status !== 201 || !regData.data || !regData.data._id) {
    console.error('FAIL: Registration did not return 201 or data._id');
    process.exit(1);
  }
  const registeredUserId = regData.data._id;
  const registrationToken = regData.data.token;

  // Verify plain password is NOT in response
  const rawBodyString = JSON.stringify(regData);
  if (rawBodyString.includes(testPassword)) {
    console.error('SECURITY VULNERABILITY: Plain text password found in API response!');
    process.exit(1);
  } else {
    console.log('✔ Plain password is NOT exposed in the registration response.');
  }

  // Verify directly from MongoDB database
  console.log('\n[3b] Direct MongoDB Document Inspection');
  const dbUser = await User.findById(registeredUserId).lean();
  console.log('Found user in MongoDB:', {
    _id: dbUser._id.toString(),
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    passwordLength: dbUser.password.length,
    passwordPrefix: dbUser.password.substring(0, 4),
  });

  if (!dbUser || dbUser.email !== testEmail) {
    console.error('FAIL: User was not found in MongoDB!');
    process.exit(1);
  }
  console.log('✔ User document verified in MongoDB collection.');

  // --- Step 4: Duplicate Registration Rejection ---
  console.log('\n[4] Testing Duplicate Registration');
  const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Duplicate User',
      email: testEmail,
      password: 'AnotherPassword456',
    }),
  });
  const dupData = await dupRes.json();
  console.log('Duplicate Registration Status:', dupRes.status);
  console.log('Duplicate Registration Response:', dupData);

  if (dupRes.status !== 400 || dupData.message !== 'User already exists') {
    console.error('FAIL: Duplicate registration was not rejected with 400!');
    process.exit(1);
  }
  console.log('✔ Duplicate registration correctly rejected with 400 Bad Request.');

  // Verify count in MongoDB is still 1
  const countInDb = await User.countDocuments({ email: testEmail });
  console.log(`Document count for ${testEmail} in MongoDB: ${countInDb}`);
  if (countInDb !== 1) {
    console.error('FAIL: Duplicate user created in MongoDB!');
    process.exit(1);
  }
  console.log('✔ Exactly 1 user document exists in MongoDB.');

  // --- Step 5: Password Hashing Verification ---
  console.log('\n[5] Verifying Password Hashing in MongoDB');
  const isHashFormat = dbUser.password.startsWith('$2a$') || dbUser.password.startsWith('$2b$');
  const isPlainText = dbUser.password === testPassword;
  console.log('Is plain text password stored in DB:', isPlainText);
  console.log('Is bcrypt hash format in DB ($2a$/$2b$):', isHashFormat);

  if (isPlainText || !isHashFormat) {
    console.error('FAIL: Password is not properly hashed in MongoDB!');
    process.exit(1);
  }

  // Test bcrypt compare
  const passwordMatch = await bcrypt.compare(testPassword, dbUser.password);
  const wrongPasswordMatch = await bcrypt.compare('WrongPassword999', dbUser.password);
  console.log('bcrypt.compare with correct password:', passwordMatch);
  console.log('bcrypt.compare with wrong password:', wrongPasswordMatch);

  if (!passwordMatch || wrongPasswordMatch) {
    console.error('FAIL: Password comparison logic failed!');
    process.exit(1);
  }
  console.log('✔ Password hashing securely verified in database.');

  // --- Step 6: Login API with Real Database ---
  console.log('\n[6] Testing Login API with Valid Credentials');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  const loginData = await loginRes.json();
  console.log('Login HTTP Status:', loginRes.status);
  console.log('Login Response (Safe sanitized):', {
    success: loginData.success,
    data: {
      _id: loginData.data?._id,
      name: loginData.data?.name,
      email: loginData.data?.email,
      role: loginData.data?.role,
      hasToken: !!loginData.data?.token,
    }
  });

  if (loginRes.status !== 200 || !loginData.data?.token) {
    console.error('FAIL: Login failed or did not return token!');
    process.exit(1);
  }
  const loginToken = loginData.data.token;
  console.log('✔ Login succeeded with 200 OK and issued a JWT token.');

  // --- Step 7: Invalid Login Handling ---
  console.log('\n[7] Testing Invalid Login Scenarios');

  // 7A: Wrong password
  const wrongPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'IncorrectPassword',
    }),
  });
  const wrongPassData = await wrongPassRes.json();
  console.log('Wrong Password Status:', wrongPassRes.status);
  console.log('Wrong Password Response:', wrongPassData);
  if (wrongPassRes.status !== 401 || wrongPassData.data?.token) {
    console.error('FAIL: Wrong password was not rejected with 401!');
    process.exit(1);
  }
  console.log('✔ Wrong password rejected with 401 Invalid credentials.');

  // 7B: Non-existing email
  const nonExistRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'nonexistent_user_9999@example.com',
      password: testPassword,
    }),
  });
  const nonExistData = await nonExistRes.json();
  console.log('Non-existing User Status:', nonExistRes.status);
  console.log('Non-existing User Response:', nonExistData);
  if (nonExistRes.status !== 401 || nonExistData.data?.token) {
    console.error('FAIL: Non-existing user was not rejected with 401!');
    process.exit(1);
  }
  console.log('✔ Non-existing user rejected with 401 Invalid credentials.');

  // 7C: Missing email
  const missingEmailRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: testPassword }),
  });
  const missingEmailData = await missingEmailRes.json();
  console.log('Missing Email Status:', missingEmailRes.status);
  console.log('Missing Email Response:', missingEmailData);
  if (missingEmailRes.status !== 400) {
    console.error('FAIL: Missing email was not rejected with 400!');
    process.exit(1);
  }
  console.log('✔ Missing email rejected with 400 Bad Request.');

  // 7D: Missing password
  const missingPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail }),
  });
  const missingPassData = await missingPassRes.json();
  console.log('Missing Password Status:', missingPassRes.status);
  console.log('Missing Password Response:', missingPassData);
  if (missingPassRes.status !== 400) {
    console.error('FAIL: Missing password was not rejected with 400!');
    process.exit(1);
  }
  console.log('✔ Missing password rejected with 400 Bad Request.');

  // --- Step 8: JWT Verification ---
  console.log('\n[8] Verifying JWT Token Claims and Structure');
  const tokenParts = loginToken.split('.');
  console.log('JWT parts count (header.payload.signature):', tokenParts.length);
  if (tokenParts.length !== 3) {
    console.error('FAIL: Token is not a valid 3-part JWT!');
    process.exit(1);
  }

  const decoded = jwt.verify(loginToken, JWT_SECRET);
  console.log('Decoded Token Claims:', {
    id: decoded.id,
    iat: decoded.iat,
    exp: decoded.exp,
  });

  if (decoded.id !== registeredUserId) {
    console.error('FAIL: Token decoded id does not match registered user id!');
    process.exit(1);
  }
  if (!decoded.exp) {
    console.error('FAIL: Token does not contain expiration (exp)!');
    process.exit(1);
  }
  console.log('✔ Token claims match user id and contain expiration.');

  // Test profile retrieval using the JWT token
  console.log('\n[8b] Testing Profile Endpoint with Verified JWT (GET /api/auth/profile)');
  const profRes = await fetch(`${BASE_URL}/api/auth/profile`, {
    headers: {
      Authorization: `Bearer ${loginToken}`,
    },
  });
  const profData = await profRes.json();
  console.log('Profile Status:', profRes.status);
  console.log('Profile Data:', profData);

  if (profRes.status !== 200 || profData.data?.email !== testEmail) {
    console.error('FAIL: Profile fetch with JWT failed!');
    process.exit(1);
  }
  console.log('✔ Profile successfully fetched via JWT Bearer authorization.');

  // Clean up test user
  await User.deleteOne({ _id: registeredUserId });
  console.log('\n✔ Test user successfully cleaned up from database.');
  await mongoose.disconnect();

  console.log('\n====================================================');
  console.log('  ALL TASK 2 DATABASE & AUTH CHECKS PASSED LIVE!    ');
  console.log('====================================================\n');
};

runTask2Verification().catch((err) => {
  console.error('Unexpected error in verification script:', err);
  process.exit(1);
});
