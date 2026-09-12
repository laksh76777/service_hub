/**
 * Phase 3: Firebase Authentication Automated Test Suite
 * Tests all 8 required items:
 * 1. Register (Firebase Auth)
 * 2. Email verification (sendOobCode / sendEmailVerification)
 * 3. Login (Firebase Auth ID Token issuance)
 * 4. Logout (Session termination / token clearance)
 * 5. Password reset (sendPasswordResetEmail)
 * 6. Protected API access (GET /api/users/me & PATCH /api/users/me)
 * 7. Unauthorized API access (No token & invalid token handling)
 * 8. Role restrictions (CUSTOMER vs PROVIDER vs ADMIN enforcement & tamper protection)
 */

const http = require('http');
require('dotenv').config();
const mongoose = require('mongoose');
const app = require('../src/app');
const config = require('../src/config/environment');
const { connectDB, disconnectDB } = require('../src/config/database');
const User = require('../src/models/User');

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
if (!FIREBASE_API_KEY) {
  console.error('ERROR: FIREBASE_API_KEY is not defined. Please configure it in your local .env file.');
  process.exit(1);
}

const TEST_TIMESTAMP = Date.now();
const TEST_EMAIL = `autotest_${TEST_TIMESTAMP}@servicehub-test.local`;
const TEST_PASSWORD = `Password123!_${TEST_TIMESTAMP}`;

// Helper: HTTP request using fetch
const makeApiRequest = async (port, path, method = 'GET', headers = {}, body = null) => {
  const url = `http://localhost:${port}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
};

// Helper: Call Firebase Auth Identity Toolkit REST API
const firebaseAuthApi = async (endpoint, payload) => {
  const url = `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Firebase Auth error [${res.status}]: ${JSON.stringify(data.error || data)}`);
  }
  return data;
};

const runTests = async () => {
  console.log('====================================================');
  console.log('Starting Phase 3: Firebase Authentication Test Suite');
  console.log('====================================================\n');

  let server;
  let testPort = 5055;
  let idToken = null;
  let firebaseUid = null;

  try {
    // 0. Connect DB & Start Test Server
    await connectDB();
    server = app.listen(testPort);
    console.log(`[Test Server] Running on http://localhost:${testPort}\n`);

    // -------------------------------------------------------------
    // Test 1: Register
    // -------------------------------------------------------------
    console.log('--- Test 1: Email/Password Registration ---');
    console.log(`Registering test user: ${TEST_EMAIL}`);
    const regResult = await firebaseAuthApi('accounts:signUp', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      returnSecureToken: true
    });
    idToken = regResult.idToken;
    firebaseUid = regResult.localId;
    console.log(`✓ Registration succeeded! Firebase UID: ${firebaseUid}`);
    console.log('✓ PASS: Test 1 (Register)\n');

    // -------------------------------------------------------------
    // Test 2: Email Verification
    // -------------------------------------------------------------
    console.log('--- Test 2: Email Verification Trigger ---');
    const verifyResult = await firebaseAuthApi('accounts:sendOobCode', {
      requestType: 'VERIFY_EMAIL',
      idToken: idToken
    });
    console.log(`✓ Verification email action dispatched for: ${verifyResult.email}`);
    console.log('✓ PASS: Test 2 (Email Verification)\n');

    // -------------------------------------------------------------
    // Test 3: Login
    // -------------------------------------------------------------
    console.log('--- Test 3: Email/Password Login ---');
    const loginResult = await firebaseAuthApi('accounts:signInWithPassword', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      returnSecureToken: true
    });
    idToken = loginResult.idToken; // fresh ID token
    console.log(`✓ Login succeeded! ID token obtained (length: ${idToken.length})`);
    console.log('✓ PASS: Test 3 (Login)\n');

    // -------------------------------------------------------------
    // Test 4: Logout (Auth state persistence & drop validation)
    // -------------------------------------------------------------
    console.log('--- Test 4: Logout / Session Teardown Simulation ---');
    // On the client, logout clears credentials. Verify that requests without token are refused.
    const unauthedCheck = await makeApiRequest(testPort, '/api/users/me', 'GET', {});
    if (unauthedCheck.status === 401) {
      console.log('✓ Verified: Requests without active session token return 401 Unauthorized.');
      console.log('✓ PASS: Test 4 (Logout)\n');
    } else {
      throw new Error(`Logout simulation failed: expected 401, got ${unauthedCheck.status}`);
    }

    // -------------------------------------------------------------
    // Test 5: Password Reset
    // -------------------------------------------------------------
    console.log('--- Test 5: Password Reset Trigger ---');
    const resetResult = await firebaseAuthApi('accounts:sendOobCode', {
      requestType: 'PASSWORD_RESET',
      email: TEST_EMAIL
    });
    console.log(`✓ Password reset email dispatched for: ${resetResult.email}`);
    console.log('✓ PASS: Test 5 (Password Reset)\n');

    // -------------------------------------------------------------
    // Test 6: Protected API Access (GET & PATCH /api/users/me)
    // -------------------------------------------------------------
    console.log('--- Test 6: Protected API Access ---');
    // 6a. GET /api/users/me (triggers auto-creation in MongoDB from verified Firebase token)
    const getMeRes = await makeApiRequest(testPort, '/api/users/me', 'GET', {
      Authorization: `Bearer ${idToken}`
    });
    console.log('GET /api/users/me response status:', getMeRes.status);
    if (getMeRes.status !== 200 || !getMeRes.data?.data?.user) {
      throw new Error(`Failed GET /api/users/me: ${JSON.stringify(getMeRes.data)}`);
    }

    const fetchedUser = getMeRes.data.data.user;
    console.log(`✓ MongoDB profile created: ID=${fetchedUser.id}, Name=${fetchedUser.name}, Role=${fetchedUser.role}`);
    if (fetchedUser.firebaseUid !== firebaseUid) {
      throw new Error(`UID mismatch: expected ${firebaseUid}, got ${fetchedUser.firebaseUid}`);
    }

    // 6b. PATCH /api/users/me
    const updateRes = await makeApiRequest(testPort, '/api/users/me', 'PATCH', {
      Authorization: `Bearer ${idToken}`
    }, {
      name: 'Automated Verified Tester',
      phone: '+1-800-555-0199'
    });
    if (updateRes.status !== 200 || updateRes.data?.data?.user?.name !== 'Automated Verified Tester') {
      throw new Error(`Failed PATCH /api/users/me: ${JSON.stringify(updateRes.data)}`);
    }
    console.log(`✓ User profile updated: Name=${updateRes.data.data.user.name}, Phone=${updateRes.data.data.user.phone}`);
    console.log('✓ PASS: Test 6 (Protected API Access)\n');

    // -------------------------------------------------------------
    // Test 7: Unauthorized API Access
    // -------------------------------------------------------------
    console.log('--- Test 7: Unauthorized API Access Handling ---');
    // 7a. No Authorization Header
    const noAuthRes = await makeApiRequest(testPort, '/api/users/me', 'GET');
    console.log(`No token status: ${noAuthRes.status} (expected 401)`);
    if (noAuthRes.status !== 401) {
      throw new Error(`Expected 401 for no token, got ${noAuthRes.status}`);
    }

    // 7b. Invalid / forged token
    const forgedTokenRes = await makeApiRequest(testPort, '/api/users/me', 'GET', {
      Authorization: 'Bearer invalid.forged.jwt.token'
    });
    console.log(`Forged token status: ${forgedTokenRes.status} (expected 401)`);
    if (forgedTokenRes.status !== 401) {
      throw new Error(`Expected 401 for forged token, got ${forgedTokenRes.status}`);
    }
    console.log('✓ PASS: Test 7 (Unauthorized API Access)\n');

    // -------------------------------------------------------------
    // Test 8: Customer / Provider / Admin Role Restrictions
    // -------------------------------------------------------------
    console.log('--- Test 8: Role Restrictions & Tamper Protection ---');

    // 8a. Security Tamper Test: Attempting to escalate role to ADMIN via PATCH
    console.log('Submitting malicious PATCH with { role: "ADMIN" }...');
    const tamperRes = await makeApiRequest(testPort, '/api/users/me', 'PATCH', {
      Authorization: `Bearer ${idToken}`
    }, {
      role: 'ADMIN'
    });
    if (tamperRes.data?.data?.user?.role === 'ADMIN') {
      throw new Error('SECURITY BREACH: Frontend successfully escalated role to ADMIN via PATCH!');
    }
    console.log(`✓ Privilege escalation prevented: User role remains "${tamperRes.data.data.user.role}".`);

    // 8b. Customer role access to customer-only endpoint
    const custRes = await makeApiRequest(testPort, '/api/test/customer-only', 'GET', {
      Authorization: `Bearer ${idToken}`
    });
    console.log(`GET /api/test/customer-only as CUSTOMER: status=${custRes.status} (expected 200)`);
    if (custRes.status !== 200) {
      throw new Error(`Customer was denied access to customer-only route: ${custRes.status}`);
    }

    // 8c. Customer attempting to access provider-only route -> 403
    const provRes = await makeApiRequest(testPort, '/api/test/provider-only', 'GET', {
      Authorization: `Bearer ${idToken}`
    });
    console.log(`GET /api/test/provider-only as CUSTOMER: status=${provRes.status} (expected 403)`);
    if (provRes.status !== 403) {
      throw new Error(`Customer was incorrectly allowed on provider-only route: ${provRes.status}`);
    }

    // 8d. Customer attempting to access admin-only route -> 403
    const adminDenyRes = await makeApiRequest(testPort, '/api/test/admin-only', 'GET', {
      Authorization: `Bearer ${idToken}`
    });
    console.log(`GET /api/test/admin-only as CUSTOMER: status=${adminDenyRes.status} (expected 403)`);
    if (adminDenyRes.status !== 403) {
      throw new Error(`Customer was incorrectly allowed on admin-only route: ${adminDenyRes.status}`);
    }

    // 8e. Legitimate Admin role authorization test
    console.log('Elevating test user in MongoDB directly to ADMIN (simulating authorized admin assignment)...');
    await User.updateOne({ firebaseUid }, { role: 'ADMIN' });

    const adminAllowRes = await makeApiRequest(testPort, '/api/test/admin-only', 'GET', {
      Authorization: `Bearer ${idToken}`
    });
    console.log(`GET /api/test/admin-only as ADMIN: status=${adminAllowRes.status} (expected 200)`);
    if (adminAllowRes.status !== 200) {
      throw new Error(`Admin was denied access to admin-only route: ${adminAllowRes.status}`);
    }
    console.log('✓ PASS: Test 8 (Customer/Provider/Admin Role Restrictions)\n');

    // -------------------------------------------------------------
    // Clean up test user from MongoDB
    // -------------------------------------------------------------
    await User.deleteOne({ firebaseUid });
    console.log(`Cleaned up test user record from MongoDB (${firebaseUid})`);

    console.log('====================================================');
    console.log('ALL 8 PHASE 3 AUTHENTICATION TESTS PASSED WITH 100%!');
    console.log('====================================================');
    process.exitCode = 0;
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
    process.exit();
  }
};

runTests();
