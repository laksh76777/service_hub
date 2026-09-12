/**
 * Phase 4: Service Provider and Service Discovery Automated Test Suite
 * Tests all requirements:
 * 1. Browse & search service categories and services (GET /api/categories, GET /api/services)
 * 2. Provider profile creation & update (GET /api/provider/profile, PATCH /api/provider/profile)
 * 3. Provider service offerings with custom pricing & description (POST, PATCH, DELETE /api/provider/services)
 * 4. Unverified provider isolation: Unverified providers are excluded from public discovery
 * 5. Admin verification queue & approval (GET /api/admin/providers, PATCH /api/admin/providers/:id/status)
 * 6. Public verified provider discovery & profile (GET /api/providers, GET /api/providers/:id, GET /api/services/:id)
 * 7. Multi-criteria filtering (category, search keyword, zip code)
 */

require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('../src/app');
const config = require('../src/config/environment');
const { connectDB, disconnectDB } = require('../src/config/database');
const { seedMarketplaceData } = require('../src/utils/seedData');
const User = require('../src/models/User');
const ProviderProfile = require('../src/models/ProviderProfile');
const ServiceCategory = require('../src/models/ServiceCategory');
const Service = require('../src/models/Service');
const { USER_ROLES, USER_STATUS, PROVIDER_STATUS } = require('../src/utils/constants');

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;

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

const runPhase4Tests = async () => {
  console.log('====================================================');
  console.log('Starting Phase 4: Marketplace & Discovery Test Suite');
  console.log('====================================================\n');

  let server;
  const testPort = 5056;

  try {
    // 0. Connect DB & start test server
    await connectDB();
    await seedMarketplaceData();
    server = app.listen(testPort);
    console.log(`[Test Server] Running on http://localhost:${testPort}\n`);

    // Setup Test Provider Account in Firebase Auth
    const ts = Date.now();
    const providerEmail = `phase4_pro_${ts}@servicehub-test.local`;
    const adminEmail = `phase4_admin_${ts}@servicehub-test.local`;
    const testPassword = `Pass_${ts}!Safe`;

    console.log('Creating test provider and admin via Firebase Auth...');
    const proAuth = await firebaseAuthApi('accounts:signUp', {
      email: providerEmail,
      password: testPassword,
      returnSecureToken: true
    });
    const proToken = proAuth.idToken;
    const proUid = proAuth.localId;

    const adminAuth = await firebaseAuthApi('accounts:signUp', {
      email: adminEmail,
      password: testPassword,
      returnSecureToken: true
    });
    const adminToken = adminAuth.idToken;
    const adminUid = adminAuth.localId;

    // Set roles in MongoDB
    const proUser = await User.create({
      firebaseUid: proUid,
      name: 'Rajesh Sharma',
      email: providerEmail,
      role: USER_ROLES.PROVIDER,
      status: USER_STATUS.ACTIVE
    });

    const adminUser = await User.create({
      firebaseUid: adminUid,
      name: 'Platform Administrator',
      email: adminEmail,
      role: USER_ROLES.ADMIN,
      status: USER_STATUS.ACTIVE
    });

    console.log(`✓ Provider (${proUser.email}) and Admin (${adminUser.email}) initialized.\n`);

    // -------------------------------------------------------------
    // Test 1: Browse Categories & Services
    // -------------------------------------------------------------
    console.log('--- Test 1: Category and Service Discovery APIs ---');
    const catRes = await makeApiRequest(testPort, '/api/categories');
    if (catRes.status !== 200 || !catRes.data?.data?.categories?.length) {
      throw new Error(`Failed to list categories: ${JSON.stringify(catRes.data)}`);
    }
    console.log(`✓ Categories fetched: found ${catRes.data.data.categories.length} active categories`);

    const srvRes = await makeApiRequest(testPort, '/api/services?limit=10');
    if (srvRes.status !== 200 || !srvRes.data?.data?.services?.length) {
      throw new Error(`Failed to list services: ${JSON.stringify(srvRes.data)}`);
    }
    const sampleService = srvRes.data.data.services[0];
    console.log(`✓ Services fetched: found ${srvRes.data.data.total} total services. Sample: "${sampleService.name}"`);

    // Search query test
    const searchRes = await makeApiRequest(testPort, `/api/services?search=${encodeURIComponent(sampleService.name.slice(0, 5))}`);
    if (searchRes.status !== 200 || searchRes.data?.data?.services?.length === 0) {
      throw new Error('Service search failed to return matching results');
    }
    console.log(`✓ Service keyword search returned matching results`);
    console.log('✓ PASS: Test 1 (Browse & Search Services)\n');

    // -------------------------------------------------------------
    // Test 2: Provider Profile Management
    // -------------------------------------------------------------
    console.log('--- Test 2: Provider Profile Management ---');
    // Get profile
    const getProfileRes = await makeApiRequest(testPort, '/api/provider/profile', 'GET', {
      Authorization: `Bearer ${proToken}`
    });
    if (getProfileRes.status !== 200 || !getProfileRes.data?.data?.profile) {
      throw new Error(`Failed to get provider profile: ${JSON.stringify(getProfileRes.data)}`);
    }
    const myProfile = getProfileRes.data.data.profile;
    console.log(`✓ Initial provider profile retrieved (Status: ${myProfile.status})`);

    // Update profile: bio, license, serviceArea, availability
    const updateProfileRes = await makeApiRequest(
      testPort,
      '/api/provider/profile',
      'PATCH',
      { Authorization: `Bearer ${proToken}` },
      {
        businessName: 'Sharma Home Services & AC Care',
        bio: 'Premier residential electrical & HVAC contractor with over 12 years experience in Bengaluru.',
        licenseNumber: `GSTIN-29AABCU-${ts.toString().slice(-4)}`,
        serviceArea: {
          cities: ['Bengaluru', 'Indiranagar', 'Koramangala'],
          pincodes: ['560038', '560001'],
          zipCodes: ['560038', '560001'],
          radiusKm: 25
        },
        availability: {
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
          workingHours: { start: '08:00', end: '20:00' },
          emergencyServices: true,
          noticeHours: 6
        }
      }
    );
    if (updateProfileRes.status !== 200 || !updateProfileRes.data?.data?.profile?.licenseNumber?.startsWith('GSTIN')) {
      throw new Error(`Failed to update provider profile: ${JSON.stringify(updateProfileRes.data)}`);
    }
    console.log(`✓ Provider profile, service area, and availability schedule updated`);
    console.log('✓ PASS: Test 2 (Provider Profile Management)\n');

    // -------------------------------------------------------------
    // Test 3: Provider Service Offerings & Pricing
    // -------------------------------------------------------------
    console.log('--- Test 3: Service Catalog & Pricing ---');
    const targetServiceId = sampleService._id;

    // Add service offering
    const addSrvRes = await makeApiRequest(
      testPort,
      '/api/provider/services',
      'POST',
      { Authorization: `Bearer ${proToken}` },
      {
        serviceId: targetServiceId,
        customTitle: 'Certified Master Jet Cleaning & Checkup',
        description: 'Includes 50-point diagnostic check and genuine OEM components.',
        pricing: {
          type: 'FIXED',
          amount: 499,
          currency: 'INR'
        }
      }
    );
    if (addSrvRes.status !== 201 || !addSrvRes.data?.data?.offering) {
      throw new Error(`Failed to add service offering: ${JSON.stringify(addSrvRes.data)}`);
    }
    console.log(`✓ Service offering added with custom pricing: ₹${addSrvRes.data.data.offering.pricing.amount}`);

    // Update service offering
    const patchSrvRes = await makeApiRequest(
      testPort,
      `/api/provider/services/${targetServiceId}`,
      'PATCH',
      { Authorization: `Bearer ${proToken}` },
      {
        customTitle: 'Certified Master Jet Cleaning & Checkup (Updated)',
        pricing: { type: 'FIXED', amount: 549, currency: 'INR' }
      }
    );
    if (patchSrvRes.status !== 200 || patchSrvRes.data?.data?.offering?.pricing?.amount !== 549) {
      throw new Error(`Failed to update service offering: ${JSON.stringify(patchSrvRes.data)}`);
    }
    console.log(`✓ Service offering pricing updated to ₹549`);
    console.log('✓ PASS: Test 3 (Service Offerings & Pricing)\n');

    // -------------------------------------------------------------
    // Test 4: Unverified Provider Isolation
    // -------------------------------------------------------------
    console.log('--- Test 4: Unverified Provider Isolation ---');
    // Public directory should NOT return the pending provider
    const publicProsBefore = await makeApiRequest(testPort, '/api/providers?search=Sharma');
    const foundUnverified = (publicProsBefore.data?.data?.providers || []).some(
      (p) => p.businessName.includes('Sharma')
    );
    if (foundUnverified) {
      throw new Error('SECURITY VIOLATION: Unverified/PENDING provider appeared in public customer search!');
    }
    console.log('✓ Verified: Unverified provider is excluded from public customer discovery.');

    // Public service detail should NOT list pending provider
    const srvDetailBefore = await makeApiRequest(testPort, `/api/services/${targetServiceId}`);
    const foundInService = (srvDetailBefore.data?.data?.providers || []).some(
      (p) => p.businessName.includes('Sharma')
    );
    if (foundInService) {
      throw new Error('SECURITY VIOLATION: Unverified provider appeared in public service contractor list!');
    }
    console.log('✓ Verified: Unverified provider is excluded from public service contractor lists.');
    console.log('✓ PASS: Test 4 (Unverified Provider Isolation)\n');

    // -------------------------------------------------------------
    // Test 5: Admin Moderation & Approval
    // -------------------------------------------------------------
    console.log('--- Test 5: Admin Moderation & Approval ---');
    // Admin checks pending providers
    const adminQueueRes = await makeApiRequest(testPort, '/api/admin/providers?status=PENDING', 'GET', {
      Authorization: `Bearer ${adminToken}`
    });
    if (adminQueueRes.status !== 200 || !adminQueueRes.data?.data?.providers) {
      throw new Error(`Admin failed to get provider queue: ${JSON.stringify(adminQueueRes.data)}`);
    }
    const pendingTarget = adminQueueRes.data.data.providers.find(
      (p) => p.userId?._id?.toString() === proUser._id.toString()
    );
    if (!pendingTarget) {
      throw new Error('Pending provider was not found in admin review queue');
    }
    console.log(`✓ Admin located pending applicant: ${pendingTarget.businessName}`);

    // Admin approves provider verification
    const approveRes = await makeApiRequest(
      testPort,
      `/api/admin/providers/${pendingTarget._id}/status`,
      'PATCH',
      { Authorization: `Bearer ${adminToken}` },
      { status: 'VERIFIED', reason: 'Trade license and GSTIN verified' }
    );
    if (approveRes.status !== 200 || approveRes.data?.data?.provider?.status !== 'VERIFIED') {
      throw new Error(`Admin failed to approve provider: ${JSON.stringify(approveRes.data)}`);
    }
    console.log(`✓ Admin successfully approved provider to VERIFIED status`);
    console.log('✓ PASS: Test 5 (Admin Moderation & Approval)\n');

    // -------------------------------------------------------------
    // Test 6: Public Discovery of Verified Provider
    // -------------------------------------------------------------
    console.log('--- Test 6: Public Discovery of Verified Provider ---');
    // Now provider should be returned in public customer directory
    const publicProsAfter = await makeApiRequest(testPort, '/api/providers?search=Sharma');
    if (publicProsAfter.status !== 200 || publicProsAfter.data?.data?.providers?.length === 0) {
      throw new Error('Verified provider was not found in public directory');
    }
    const discoveredPro = publicProsAfter.data.data.providers[0];
    console.log(`✓ Discovered verified provider in customer search: "${discoveredPro.businessName}"`);

    // Check public provider detail page endpoint
    const proDetailRes = await makeApiRequest(testPort, `/api/providers/${discoveredPro.id}`);
    if (proDetailRes.status !== 200 || !proDetailRes.data?.data?.provider) {
      throw new Error(`Failed to get public provider detail: ${JSON.stringify(proDetailRes.data)}`);
    }
    const proDetail = proDetailRes.data.data.provider;
    console.log(`✓ Public profile details retrieved: Rating=${proDetail.rating?.average}, Cities=${proDetail.serviceArea?.cities?.length}, Active Services=${proDetail.services?.length}`);
    if (proDetail.services.length === 0 || proDetail.services[0].pricing?.amount !== 549) {
      throw new Error('Public profile does not reflect customized service pricing');
    }
    console.log('✓ PASS: Test 6 (Public Discovery of Verified Provider)\n');

    // -------------------------------------------------------------
    // Test 7: Geographic Pincode / Zip Code Filtering
    // -------------------------------------------------------------
    console.log('--- Test 7: Geographic PIN Code Filtering ---');
    const zipFilterRes = await makeApiRequest(testPort, '/api/providers?pincode=560038');
    const matchedZip = (zipFilterRes.data?.data?.providers || []).some(
      (p) => p.businessName.includes('Sharma')
    );
    if (!matchedZip) {
      throw new Error('Pincode filter failed to return provider covering 560038');
    }
    console.log('✓ PIN code search successfully matched contractor service area');
    console.log('✓ PASS: Test 7 (Geographic Filtering)\n');

    // -------------------------------------------------------------
    // Clean up test data
    // -------------------------------------------------------------
    await ProviderProfile.deleteOne({ userId: proUser._id });
    await User.deleteMany({ _id: { $in: [proUser._id, adminUser._id] } });
    console.log('Cleaned up test provider and admin records from MongoDB');

    console.log('\n====================================================');
    console.log('ALL PHASE 4 MARKETPLACE & DISCOVERY TESTS PASSED (100%)!');
    console.log('====================================================');
    process.exitCode = 0;
  } catch (err) {
    console.error('\n❌ PHASE 4 TEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    await disconnectDB();
    process.exit();
  }
};

runPhase4Tests();
