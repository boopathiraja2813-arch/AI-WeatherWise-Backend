/**
 * Task 3 Live Verification Script
 * Validates JWT Protected Routes, Favorite Locations CRUD, User Isolation,
 * Validation rules, and direct MongoDB persistence.
 */
const mongoose = require('mongoose');
require('dotenv').config();

const BASE_URL = 'http://localhost:5001';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/weatherwise';

const runTask3Verification = async () => {
  console.log('================================================================');
  console.log('  TASK 3: JWT PROTECTED ROUTES & FAVORITE LOCATIONS VERIFICATION');
  console.log('================================================================\n');

  // Connect directly to MongoDB for persistence auditing
  await mongoose.connect(MONGO_URI);
  console.log('✔ Direct MongoDB connection established for verification.\n');
  const User = require('../src/models/User');
  const Location = require('../src/models/Location');

  const createdUserIds = [];
  const createdLocationIds = [];

  const apiRequest = async (endpoint, method = 'GET', body = null, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
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

  try {
    // -------------------------------------------------------------
    // 1. AUTHENTICATION / JWT PROTECTION
    // -------------------------------------------------------------
    console.log('[1] Testing Authentication & JWT Route Protection on /api/locations');

    // A. Request without Authorization header
    const noHeaderRes = await apiRequest('/api/locations', 'GET');
    console.log('No Token Status:', noHeaderRes.status);
    console.log('No Token Response:', noHeaderRes.data);
    if (noHeaderRes.status !== 401 || !noHeaderRes.data.message.includes('no token provided')) {
      throw new Error('FAIL: Missing token was not rejected with 401!');
    }
    console.log('✔ Request without Authorization header correctly rejected (401).');

    // B. Request with invalid JWT
    const invalidTokenRes = await apiRequest('/api/locations', 'GET', null, 'invalid_token_xyz');
    console.log('Invalid Token Status:', invalidTokenRes.status);
    console.log('Invalid Token Response:', invalidTokenRes.data);
    if (invalidTokenRes.status !== 401 || !invalidTokenRes.data.message.includes('token verification failed')) {
      throw new Error('FAIL: Invalid token was not rejected with 401!');
    }
    console.log('✔ Request with invalid token correctly rejected (401).');

    // C. Request with malformed JWT
    const malformedTokenRes = await apiRequest('/api/locations', 'GET', null, 'header.payload.badsignature');
    console.log('Malformed Token Status:', malformedTokenRes.status);
    console.log('Malformed Token Response:', malformedTokenRes.data);
    if (malformedTokenRes.status !== 401) {
      throw new Error('FAIL: Malformed token was not rejected with 401!');
    }
    console.log('✔ Request with malformed token correctly rejected (401).');

    // -------------------------------------------------------------
    // Set up Real Test Users in Database
    // -------------------------------------------------------------
    console.log('\n[Setup] Registering User 1 and User 2 via live API');
    const timestamp = Date.now();
    const user1Email = `user1_${timestamp}@example.com`;
    const user2Email = `user2_${timestamp}@example.com`;

    // Register User 1
    const reg1 = await apiRequest('/api/auth/register', 'POST', {
      name: 'User One',
      email: user1Email,
      password: 'Password123!',
      role: 'user'
    });
    if (reg1.status !== 201) throw new Error('Failed to register User 1');
    const user1Id = reg1.data.data._id;
    const user1Token = reg1.data.data.token;
    createdUserIds.push(user1Id);
    console.log(`✔ User 1 created: ${user1Email} (_id: ${user1Id})`);

    // Register User 2
    const reg2 = await apiRequest('/api/auth/register', 'POST', {
      name: 'User Two',
      email: user2Email,
      password: 'Password123!',
      role: 'user'
    });
    if (reg2.status !== 201) throw new Error('Failed to register User 2');
    const user2Id = reg2.data.data._id;
    const user2Token = reg2.data.data.token;
    createdUserIds.push(user2Id);
    console.log(`✔ User 2 created: ${user2Email} (_id: ${user2Id})`);

    // D. Request with valid JWT (User 1)
    const validTokenRes = await apiRequest('/api/locations', 'GET', null, user1Token);
    console.log('Valid Token Status:', validTokenRes.status);
    console.log('Valid Token Response:', validTokenRes.data);
    if (validTokenRes.status !== 200 || !validTokenRes.data.success) {
      throw new Error('FAIL: Valid token request did not proceed with 200 OK!');
    }
    console.log('✔ Request with valid token successfully proceeds (200 OK).');

    // -------------------------------------------------------------
    // 2. CREATE FAVORITE LOCATION
    // -------------------------------------------------------------
    console.log('\n[2] Testing Create Favorite Location (User 1)');
    const createRes = await apiRequest('/api/locations', 'POST', {
      city: 'Chennai',
      country: 'India'
    }, user1Token);
    console.log('Create Location Status:', createRes.status);
    console.log('Create Location Response:', createRes.data);

    if (createRes.status !== 201 || !createRes.data.data?._id) {
      throw new Error('FAIL: Create location did not return 201 Created!');
    }
    const location1Id = createRes.data.data._id;
    createdLocationIds.push(location1Id);

    // Verify response content & ensure no secrets leaked
    const rawResString = JSON.stringify(createRes.data);
    if (rawResString.includes('password') || rawResString.includes('JWT_SECRET')) {
      throw new Error('SECURITY VULNERABILITY: Sensitive credentials in response!');
    }
    console.log('✔ Response contains expected location info without exposing secrets.');

    // Direct MongoDB persistence verification
    const dbLoc1 = await Location.findById(location1Id).lean();
    console.log('Location document in MongoDB:', {
      _id: dbLoc1._id.toString(),
      city: dbLoc1.city,
      country: dbLoc1.country,
      user: dbLoc1.user.toString()
    });

    if (!dbLoc1 || dbLoc1.city !== 'Chennai' || dbLoc1.country !== 'India') {
      throw new Error('FAIL: Location document not found in MongoDB!');
    }
    if (dbLoc1.user.toString() !== user1Id) {
      throw new Error('FAIL: Location is not associated with User 1 ID!');
    }
    console.log('✔ Location document verified in MongoDB with correct user reference.');

    // -------------------------------------------------------------
    // 3. GET FAVORITE LOCATIONS
    // -------------------------------------------------------------
    console.log('\n[3] Testing Get Favorite Locations (User 1)');
    const getRes = await apiRequest('/api/locations', 'GET', null, user1Token);
    console.log('Get Locations Status:', getRes.status);
    console.log('Get Locations Count:', getRes.data.count);

    if (getRes.status !== 200 || getRes.data.count !== 1) {
      throw new Error('FAIL: Get locations count is not 1!');
    }
    const foundChennai = getRes.data.data.find(loc => loc.city === 'Chennai' && loc.country === 'India');
    if (!foundChennai) {
      throw new Error('FAIL: Chennai was not found in favorites list!');
    }
    console.log('✔ Chennai favorite appears in list from MongoDB.');

    // -------------------------------------------------------------
    // 4. USER ISOLATION
    // -------------------------------------------------------------
    console.log('\n[4] Testing User Isolation (User 2 vs User 1)');

    // User 2 fetches locations (should be empty, cannot see User 1's favorites)
    const user2GetRes = await apiRequest('/api/locations', 'GET', null, user2Token);
    console.log('User 2 Locations Count:', user2GetRes.data.count);
    if (user2GetRes.data.count !== 0) {
      throw new Error('SECURITY LEAK: User 2 can see User 1 favorite locations!');
    }
    console.log("✔ User 2 cannot see User 1's favorite locations (returns 0 items).");

    // User 2 adds their own separate favorite location (e.g. Mumbai)
    const user2AddRes = await apiRequest('/api/locations', 'POST', {
      city: 'Mumbai',
      country: 'India'
    }, user2Token);
    const location2Id = user2AddRes.data.data._id;
    createdLocationIds.push(location2Id);
    console.log(`✔ User 2 added their own favorite: Mumbai (_id: ${location2Id})`);

    // Verify User 1 cannot see User 2's Mumbai
    const user1Recheck = await apiRequest('/api/locations', 'GET', null, user1Token);
    const hasMumbaiInUser1 = user1Recheck.data.data.some(l => l.city === 'Mumbai');
    if (hasMumbaiInUser1) {
      throw new Error('SECURITY LEAK: User 1 sees User 2 location!');
    }
    console.log("✔ User 1 list remains isolated (only contains User 1's Chennai).");

    // User 2 attempts to update User 1's location by targeting User 1's locationId
    console.log("\n[4b] Testing Unauthorized Update (User 2 targeting User 1's location)");
    const hackUpdateRes = await apiRequest(`/api/locations/${location1Id}`, 'PUT', {
      city: 'HackedCity',
      country: 'HackedCountry'
    }, user2Token);
    console.log('Unauthorized Update Status:', hackUpdateRes.status);
    console.log('Unauthorized Update Response:', hackUpdateRes.data);

    if (hackUpdateRes.status !== 401 || !hackUpdateRes.data.message.includes('not authorized')) {
      throw new Error('SECURITY VULNERABILITY: User 2 was able to update User 1 location!');
    }
    // Verify MongoDB document was NOT modified
    const dbLoc1AfterHack = await Location.findById(location1Id).lean();
    if (dbLoc1AfterHack.city !== 'Chennai') {
      throw new Error('CRITICAL BUG: User 1 location was modified in database!');
    }
    console.log('✔ Unauthorized update rejected (401). MongoDB document remains unmodified.');

    // -------------------------------------------------------------
    // 5. DELETE FAVORITE LOCATION
    // -------------------------------------------------------------
    console.log('\n[5] Testing Delete Favorite Location');

    // Test 5A: User 2 attempts to delete User 1's location
    const unauthDeleteRes = await apiRequest(`/api/locations/${location1Id}`, 'DELETE', null, user2Token);
    console.log('User 2 Deleting User 1 Location Status:', unauthDeleteRes.status);
    console.log('Response:', unauthDeleteRes.data);
    if (unauthDeleteRes.status !== 401) {
      throw new Error('SECURITY VULNERABILITY: User 2 deleted User 1 location!');
    }
    console.log('✔ Unauthorized deletion by User 2 rejected with 401.');

    // Test 5B: No JWT attempting deletion
    const noJwtDeleteRes = await apiRequest(`/api/locations/${location1Id}`, 'DELETE');
    if (noJwtDeleteRes.status !== 401) {
      throw new Error('FAIL: Delete without JWT was not rejected with 401!');
    }
    console.log('✔ Deletion without JWT rejected with 401.');

    // Test 5C: Invalid JWT attempting deletion
    const invalidJwtDeleteRes = await apiRequest(`/api/locations/${location1Id}`, 'DELETE', null, 'bad.token.signature');
    if (invalidJwtDeleteRes.status !== 401) {
      throw new Error('FAIL: Delete with invalid JWT was not rejected with 401!');
    }
    console.log('✔ Deletion with invalid JWT rejected with 401.');

    // Test 5D: Authorized deletion by User 1
    const authDeleteRes = await apiRequest(`/api/locations/${location1Id}`, 'DELETE', null, user1Token);
    console.log('Authorized Delete Status:', authDeleteRes.status);
    console.log('Authorized Delete Response:', authDeleteRes.data);
    if (authDeleteRes.status !== 200 || !authDeleteRes.data.success) {
      throw new Error('FAIL: Authorized deletion did not return 200 OK!');
    }
    console.log('✔ Authorized deletion succeeded with 200 OK.');

    // Direct MongoDB verification of deletion
    const dbLoc1AfterDelete = await Location.findById(location1Id);
    if (dbLoc1AfterDelete !== null) {
      throw new Error('FAIL: Deleted location still exists in MongoDB!');
    }
    console.log('✔ Document confirmed permanently removed from MongoDB.');

    // -------------------------------------------------------------
    // 6. VALIDATION & DUPLICATE CASES
    // -------------------------------------------------------------
    console.log('\n[6] Testing Validation and Duplicate Rejection');

    // Missing city
    const missCityRes = await apiRequest('/api/locations', 'POST', { country: 'India' }, user1Token);
    console.log('Missing City Status:', missCityRes.status);
    if (missCityRes.status !== 400) throw new Error('FAIL: Missing city not rejected with 400!');
    console.log('✔ Missing city rejected with 400.');

    // Missing country
    const missCountryRes = await apiRequest('/api/locations', 'POST', { city: 'Delhi' }, user1Token);
    console.log('Missing Country Status:', missCountryRes.status);
    if (missCountryRes.status !== 400) throw new Error('FAIL: Missing country not rejected with 400!');
    console.log('✔ Missing country rejected with 400.');

    // Empty city string
    const emptyCityRes = await apiRequest('/api/locations', 'POST', { city: '   ', country: 'India' }, user1Token);
    console.log('Empty City Status:', emptyCityRes.status);
    if (emptyCityRes.status !== 400) throw new Error('FAIL: Empty city not rejected with 400!');
    console.log('✔ Empty city string rejected with 400.');

    // Add Delhi for User 1
    const addDelhi1 = await apiRequest('/api/locations', 'POST', { city: 'Delhi', country: 'India' }, user1Token);
    createdLocationIds.push(addDelhi1.data.data._id);
    console.log('Added Delhi successfully:', addDelhi1.status === 201);

    // Duplicate favorite rejection
    const addDelhiDuplicate = await apiRequest('/api/locations', 'POST', { city: 'Delhi', country: 'India' }, user1Token);
    console.log('Duplicate Location Status:', addDelhiDuplicate.status);
    console.log('Duplicate Location Response:', addDelhiDuplicate.data);
    if (addDelhiDuplicate.status !== 400 || !addDelhiDuplicate.data.message.includes('already in your favorites')) {
      throw new Error('FAIL: Duplicate location was not rejected with 400!');
    }
    console.log('✔ Duplicate favorite correctly rejected with 400 Bad Request.');

    // Case-insensitive duplicate rejection (e.g. "delhi", "india")
    const addDelhiCaseInsensitive = await apiRequest('/api/locations', 'POST', { city: 'delhi', country: 'india' }, user1Token);
    if (addDelhiCaseInsensitive.status !== 400) {
      throw new Error('FAIL: Case-insensitive duplicate was not rejected!');
    }
    console.log('✔ Case-insensitive duplicate ("delhi", "india") rejected with 400.');

  } finally {
    // -------------------------------------------------------------
    // Clean up temporary test data
    // -------------------------------------------------------------
    console.log('\n[Cleanup] Cleaning up all test locations and users from MongoDB');
    if (createdLocationIds.length > 0) {
      await Location.deleteMany({ _id: { $in: createdLocationIds } });
      console.log(`✔ Cleaned up ${createdLocationIds.length} test location(s).`);
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
      console.log(`✔ Cleaned up ${createdUserIds.length} test user(s).`);
    }
    await mongoose.disconnect();
    console.log('✔ MongoDB connection closed.');
  }

  console.log('\n================================================================');
  console.log('  ALL TASK 3 JWT & FAVORITE LOCATION CHECKS PASSED LIVE!         ');
  console.log('================================================================\n');
};

runTask3Verification().catch((err) => {
  console.error('\n❌ Verification Failed:', err.message);
  process.exit(1);
});
