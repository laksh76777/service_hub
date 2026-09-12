/**
 * Automated Test Suite: Authentication, Roles, Profiles & Demo Accounts
 *
 * Verifies:
 * 1. Demo accounts endpoint (GET /api/test/demo-accounts) has 1 Admin, 1 Customer, 5 Technicians.
 * 2. Strict Role RBAC enforcement:
 *    - Unauthenticated requests return 401
 *    - Customer accessing Technician portal returns 403
 *    - Customer accessing Admin dashboard returns 403
 *    - Technician accessing Admin portal returns 403
 *    - Admin accessing Technician portal returns 403
 *    - Admin or Technician creating customer booking returns 403
 * 3. Profile Separation (getMe):
 *    - Customer profile has only customer fields (no technician or admin fields)
 *    - Technician profile has only technician fields (profession, experience, verificationStatus, etc.)
 *    - Admin profile has only admin fields (no technician profile or customer address lists)
 * 4. Registration Security & Technician Verification:
 *    - Malicious attempt to self-assign ADMIN role during registration is rejected
 *    - Newly registered technician defaults to status: PENDING (never auto-verified)
 * 5. Public technician directory excludes Admin users
 */

const express = require('express');
const { requireRole } = require('../src/middleware/auth');
const { USER_ROLES } = require('../src/utils/constants');
const userController = require('../src/controllers/userController');
const testAuthRoutes = require('../src/routes/testAuthRoutes');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(message);
  }
  passedTests++;
  console.log(`  ✓ PASSED: ${message}`);
}

async function runAllTests() {
  console.log('\n============================================================');
  console.log('🧪 SERVICEHUB AUTH, ROLES & PROFILE INTEGRITY TEST SUITE');
  console.log('============================================================\n');

  // -------------------------------------------------------------
  // Test Section 1: Demo Accounts Endpoint
  // -------------------------------------------------------------
  console.log('🔹 [1/5] Testing Demo Accounts Endpoint (GET /api/test/demo-accounts)...');
  {
    const req = {};
    let statusCode = null;
    let responseData = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    // Find handler in testAuthRoutes
    const demoAccountsRoute = testAuthRoutes.stack.find(
      (layer) => layer.route && layer.route.path === '/demo-accounts' && layer.route.methods.get
    );
    assert(!!demoAccountsRoute, 'Found /demo-accounts route in testAuthRoutes');

    demoAccountsRoute.route.stack[0].handle(req, res);
    assert(statusCode === 200, 'Endpoint returned HTTP 200 OK');
    assert(responseData && responseData.success === true, 'Response marked as success: true');

    const accounts = responseData.data?.accounts || [];
    assert(accounts.length === 7, `Returned exactly 7 canonical demo accounts (got ${accounts.length})`);

    const admin = accounts.find((a) => a.role === 'Admin');
    assert(admin && admin.email === 'abc@gmail.com', 'Canonical Admin is abc@gmail.com');

    const customer = accounts.find((a) => a.role === 'Customer');
    assert(customer && customer.email === 'laksh@gmail.com', 'Canonical Customer is laksh@gmail.com');

    const technicians = accounts.filter((a) => a.role === 'Technician');
    assert(technicians.length === 5, 'Canonical Technicians count is exactly 5');

    const expectedEmails = ['ac@gmail.com', 'plumber@gmail.com', 'electrician@gmail.com', 'ro@gmail.com', 'appliance@gmail.com'];
    const actualEmails = technicians.map((t) => t.email);
    const allEmailsMatch = expectedEmails.every((e) => actualEmails.includes(e));
    assert(allEmailsMatch, `All 5 technician emails match: ${actualEmails.join(', ')}`);
  }

  // -------------------------------------------------------------
  // Test Section 2: Strict RBAC & Role Middleware
  // -------------------------------------------------------------
  console.log('\n🔹 [2/5] Testing RBAC Middleware (requireRole)...');
  {
    // Test 2a: Unauthenticated user check
    {
      const req = { user: null };
      let statusCode = null;
      let errorMsg = '';
      const res = {
        status(code) { statusCode = code; return this; },
        json(data) { errorMsg = data.message; return this; }
      };
      let nextCalled = false;
      const middleware = requireRole('CUSTOMER');
      middleware(req, res, () => { nextCalled = true; });

      assert(statusCode === 401 && !nextCalled, 'Unauthenticated request receives 401');
    }

    // Test 2b: Customer attempting to access technician-only route
    {
      const req = { user: { role: 'CUSTOMER', name: 'Laksh' } };
      let statusCode = null;
      const res = {
        status(code) { statusCode = code; return this; },
        json() { return this; }
      };
      let nextCalled = false;
      const middleware = requireRole('TECHNICIAN', 'PROVIDER');
      middleware(req, res, () => { nextCalled = true; });

      assert(statusCode === 403 && !nextCalled, 'Customer accessing Technician portal receives 403 Forbidden');
    }

    // Test 2c: Customer attempting to access admin route
    {
      const req = { user: { role: 'CUSTOMER', name: 'Laksh' } };
      let statusCode = null;
      const res = {
        status(code) { statusCode = code; return this; },
        json() { return this; }
      };
      let nextCalled = false;
      const middleware = requireRole('ADMIN');
      middleware(req, res, () => { nextCalled = true; });

      assert(statusCode === 403 && !nextCalled, 'Customer accessing Admin console receives 403 Forbidden');
    }

    // Test 2d: Technician attempting to access admin route
    {
      const req = { user: { role: 'TECHNICIAN', name: 'Rahul Sharma' } };
      let statusCode = null;
      const res = {
        status(code) { statusCode = code; return this; },
        json() { return this; }
      };
      let nextCalled = false;
      const middleware = requireRole('ADMIN');
      middleware(req, res, () => { nextCalled = true; });

      assert(statusCode === 403 && !nextCalled, 'Technician accessing Admin console receives 403 Forbidden');
    }

    // Test 2e: Admin attempting to access technician portal
    {
      const req = { user: { role: 'ADMIN', name: 'Admin User' } };
      let statusCode = null;
      const res = {
        status(code) { statusCode = code; return this; },
        json() { return this; }
      };
      let nextCalled = false;
      const middleware = requireRole('TECHNICIAN', 'PROVIDER');
      middleware(req, res, () => { nextCalled = true; });

      assert(statusCode === 403 && !nextCalled, 'Admin accessing Technician portal receives 403 Forbidden');
    }

    // Test 2f: Admin attempting to create a customer booking
    {
      const req = { user: { role: 'ADMIN', name: 'Admin User' } };
      let statusCode = null;
      const res = {
        status(code) { statusCode = code; return this; },
        json() { return this; }
      };
      let nextCalled = false;
      const middleware = requireRole(USER_ROLES.CUSTOMER);
      middleware(req, res, () => { nextCalled = true; });

      assert(statusCode === 403 && !nextCalled, 'Admin attempting to create booking receives 403 Forbidden');
    }

    // Test 2g: Legitimate Customer creating a booking
    {
      const req = { user: { role: 'CUSTOMER', name: 'Laksh' } };
      let nextCalled = false;
      const middleware = requireRole(USER_ROLES.CUSTOMER);
      middleware(req, {}, () => { nextCalled = true; });

      assert(nextCalled === true, 'Customer role is authorized to create bookings (200/proceed)');
    }

    // Test 2h: Legitimate Admin accessing admin console
    {
      const req = { user: { role: 'ADMIN', name: 'Admin' } };
      let nextCalled = false;
      const middleware = requireRole(USER_ROLES.ADMIN);
      middleware(req, {}, () => { nextCalled = true; });

      assert(nextCalled === true, 'Admin role is authorized for Admin endpoints');
    }
  }

  // -------------------------------------------------------------
  // Test Section 3: Profile Separation (getMe)
  // -------------------------------------------------------------
  console.log('\n🔹 [3/5] Testing Strict Profile Separation (getMe)...');
  {
    const mongoose = require('mongoose');
    const ProviderProfile = require('../src/models/ProviderProfile');
    const Address = require('../src/models/Address');
    const Booking = require('../src/models/Booking');
    const origFindOne = ProviderProfile.findOne;
    const origAddressFind = Address.find;
    const origBookingCount = Booking.countDocuments;

    try {
      Booking.countDocuments = () => Promise.resolve(3);

      Address.find = () => ({
        sort: () => ({
          lean: () => Promise.resolve([
            { _id: new mongoose.Types.ObjectId(), label: 'Home', addressLine1: 'Indiranagar', city: 'Bengaluru', isDefault: true }
          ])
        })
      });

      // 3a: Customer Profile
      {
        const mockCustId = new mongoose.Types.ObjectId();
        const mockCustomer = {
          _id: mockCustId,
          firebaseUid: 'fb_cust_1',
          name: 'Laksh Suthar',
          email: 'laksh@gmail.com',
          phone: '+919876543210',
          role: 'CUSTOMER',
          status: 'ACTIVE',
          address: 'Indiranagar, Bengaluru'
        };

        const req = { user: mockCustomer };
        let responseData = null;
        const res = {
          status(code) { return this; },
          json(data) { responseData = data; return this; }
        };

        await userController.getMe(req, res);

        assert(responseData && responseData.success === true, 'getMe succeeded for Customer');
        const profile = responseData.data.profile;
        assert(profile.role === 'CUSTOMER', 'Profile role is CUSTOMER');
        assert(profile.personalInfo && profile.personalInfo.name === 'Laksh Suthar', 'Customer has personalInfo');
        assert(profile.personalInfo.phone === '+919876543210', 'Customer has phone');
        assert(profile.addresses && Array.isArray(profile.addresses), 'Customer has addresses array');

        // Verify absence of technician or admin fields
        assert(profile.businessName === undefined, 'Customer profile does NOT contain businessName');
        assert(profile.profession === undefined, 'Customer profile does NOT contain profession');
        assert(profile.experience === undefined, 'Customer profile does NOT contain experience');
        assert(profile.verificationStatus === undefined, 'Customer profile does NOT contain verificationStatus');
        assert(profile.adminAccountInfo === undefined, 'Customer profile does NOT contain adminAccountInfo');
      }

      // 3b: Technician Profile
      {
        const mockTechId = new mongoose.Types.ObjectId();
        const mockTech = {
          _id: mockTechId,
          firebaseUid: 'fb_tech_1',
          name: 'Rahul Sharma',
          email: 'ac@gmail.com',
          phone: '+919811122233',
          role: 'TECHNICIAN',
          status: 'ACTIVE'
        };

        const mockTechDoc = {
          userId: mockTechId,
          businessName: 'CoolCare AC Solutions',
          profession: 'HVAC Specialist',
          experience: '8+ years of commercial and residential HVAC servicing',
          experienceYears: 8,
          bio: 'Expert AC Technician certified by Daikin and Voltas.',
          rating: 4.9,
          reviewCount: 42,
          verificationStatus: 'VERIFIED',
          status: 'ACTIVE',
          city: 'Bengaluru',
          serviceCategories: ['AC Repair', 'AC Installation']
        };

        const createQueryChain = () => {
          const chain = {
            populate: () => chain,
            lean: () => Promise.resolve(mockTechDoc)
          };
          return chain;
        };

        ProviderProfile.findOne = () => createQueryChain();

        const req = { user: mockTech };
        let responseData = null;
        const res = {
          status(code) { return this; },
          json(data) { responseData = data; return this; }
        };

        await userController.getMe(req, res);

        assert(responseData && responseData.success === true, 'getMe succeeded for Technician');
        const profile = responseData.data.profile;
        assert(profile.role === 'TECHNICIAN', 'Profile role is TECHNICIAN');
        assert(profile.profession === 'HVAC Specialist', 'Technician has profession');
        assert(profile.experienceYears === 8, 'Technician has experienceYears');
        assert(profile.verificationStatus === 'VERIFIED', 'Technician has verificationStatus');
        assert(profile.rating === 4.9, 'Technician has rating');
        assert(profile.businessName === 'CoolCare AC Solutions', 'Technician has businessName');

        // Verify absence of customer-specific address lists or admin fields
        assert(profile.adminAccountInfo === undefined, 'Technician profile does NOT contain adminAccountInfo');
        assert(profile.superAdmin === undefined, 'Technician profile does NOT contain superAdmin');
      }

      // 3c: Admin Profile
      {
        const mockAdminId = new mongoose.Types.ObjectId();
        const mockAdmin = {
          _id: mockAdminId,
          firebaseUid: 'fb_admin_1',
          name: 'Platform Administrator',
          email: 'abc@gmail.com',
          phone: '+919999999999',
          role: 'ADMIN',
          status: 'ACTIVE'
        };

        const req = { user: mockAdmin };
        let responseData = null;
        const res = {
          status(code) { return this; },
          json(data) { responseData = data; return this; }
        };

        await userController.getMe(req, res);

        assert(responseData && responseData.success === true, 'getMe succeeded for Admin');
        const profile = responseData.data.profile;
        assert(profile.role === 'ADMIN', 'Profile role is ADMIN');
        assert(profile.adminAccountInfo && profile.adminAccountInfo.dashboardAccess === true, 'Admin has dashboardAccess: true');
        assert(profile.adminAccountInfo.superAdmin === true, 'Admin has superAdmin: true');

        // Strict verification: zero technician fields
        assert(profile.technicianProfile === undefined, 'Admin profile does NOT contain technicianProfile');
        assert(profile.businessName === undefined, 'Admin profile does NOT contain businessName');
        assert(profile.profession === undefined, 'Admin profile does NOT contain profession');
        assert(profile.verificationStatus === undefined, 'Admin profile does NOT contain verificationStatus');
        assert(profile.services === undefined, 'Admin profile does NOT contain services');
      }
    } finally {
      ProviderProfile.findOne = origFindOne;
      Address.find = origAddressFind;
      Booking.countDocuments = origBookingCount;
    }
  }

  // -------------------------------------------------------------
  // Test Section 4: Registration Security & Technician Verification
  // -------------------------------------------------------------
  console.log('\n🔹 [4/5] Testing Registration Security & PENDING Verification Status...');
  {
    const User = require('../src/models/User');
    const ProviderProfile = require('../src/models/ProviderProfile');

    const origUserFindOne = User.findOne;
    const origUserCreate = User.create;
    const origProviderFindOne = ProviderProfile.findOne;
    const origProviderCreate = ProviderProfile.create;

    try {
      // 4a: Malicious Registration Attempting to pass role: 'ADMIN'
      {
        let createdUser = null;
        User.findOne = () => Promise.resolve(null);
        User.create = (doc) => {
          createdUser = doc;
          return Promise.resolve({ ...doc, _id: 'fake_user_id', save: () => Promise.resolve() });
        };

        const req = {
          firebaseUser: { uid: 'hacker_uid', email: 'hacker@evil.com', name: 'Hacker' },
          body: {
            role: 'ADMIN', // Malicious attempt!
            name: 'Hacker Name'
          }
        };

        let responseData = null;
        const res = {
          status(code) { return this; },
          json(data) { responseData = data; return this; }
        };

        await userController.syncProfile(req, res);

        assert(createdUser.role !== 'ADMIN', 'Malicious user cannot self-assign ADMIN role');
        assert(createdUser.role === 'CUSTOMER', 'User defaults safely to CUSTOMER role');
      }

      // 4b: Technician Registration with PENDING status
      {
        let userInstance = null;
        let createdProvider = null;

        User.findOne = () => Promise.resolve(null);
        User.create = (doc) => {
          userInstance = { ...doc, _id: 'tech_new_id', save: () => Promise.resolve() };
          return Promise.resolve(userInstance);
        };

        ProviderProfile.findOne = () => Promise.resolve(null);
        ProviderProfile.create = (doc) => {
          createdProvider = doc;
          return Promise.resolve({ ...doc, _id: 'tech_prof_id', save: () => Promise.resolve() });
        };

        const req = {
          firebaseUser: { uid: 'tech_uid_new', email: 'newtech@gmail.com', name: 'New Electrician' },
          body: {
            role: 'TECHNICIAN',
            name: 'New Electrician',
            phone: '+919876540000',
            profession: 'Master Electrician',
            experience: '6 years electrical rewiring & DB repair',
            city: 'Bengaluru',
            bio: 'Certified electrician specializing in short-circuit detection.'
          }
        };

        let responseData = null;
        const res = {
          status(code) { return this; },
          json(data) { responseData = data; return this; }
        };

        await userController.syncProfile(req, res);

        assert(userInstance && userInstance.role === 'TECHNICIAN', 'Registered user role is TECHNICIAN');
        assert(createdProvider !== null, 'Technician ProviderProfile was created');
        assert(createdProvider.status === 'PENDING', 'New technician status is strictly PENDING (not auto-verified)');
        assert(createdProvider.verificationStatus === 'PENDING', 'New technician verificationStatus is PENDING');
        assert(createdProvider.profession === 'Master Electrician', 'Technician profession is saved');
        assert(createdProvider.experience === '6 years electrical rewiring & DB repair', 'Technician experience is saved');
        assert(createdProvider.experienceYears === 6, 'Technician experienceYears parsed accurately');
      }
    } finally {
      User.findOne = origUserFindOne;
      User.create = origUserCreate;
      ProviderProfile.findOne = origProviderFindOne;
      ProviderProfile.create = origProviderCreate;
    }
  }

  // -------------------------------------------------------------
  // Test Section 5: Public Providers Listing Excludes Admin
  // -------------------------------------------------------------
  console.log('\n🔹 [5/5] Testing Public Providers Listing Filters Out Admins...');
  {
    const providerController = require('../src/controllers/providerController');
    const ProviderProfile = require('../src/models/ProviderProfile');
    const origFind = ProviderProfile.find;
    const origCount = ProviderProfile.countDocuments;

    try {
      // Mock returns 1 verified technician and 1 admin profile (simulating dirty legacy record)
      ProviderProfile.countDocuments = () => Promise.resolve(1);
      const mockProviders = [
        {
          _id: 'p1',
          businessName: 'CoolCare Solutions',
          profession: 'AC Technician',
          experience: '5 years',
          status: 'ACTIVE',
          verificationStatus: 'VERIFIED',
          userId: { _id: 'u1', name: 'Rahul', role: 'TECHNICIAN' }
        },
        {
          _id: 'p2',
          businessName: 'Admin Inc',
          profession: 'Admin',
          status: 'ACTIVE',
          verificationStatus: 'VERIFIED',
          userId: { _id: 'u2', name: 'Admin', role: 'ADMIN' }
        }
      ];

      const createQueryChain = () => {
        const chain = {
          populate: () => chain,
          sort: () => chain,
          skip: () => chain,
          limit: () => chain,
          lean: () => Promise.resolve(mockProviders)
        };
        return chain;
      };

      ProviderProfile.find = () => createQueryChain();

      const req = { query: {} };
      let responseData = null;
      const res = {
        status(code) { return this; },
        json(data) { responseData = data; return this; }
      };

      await providerController.getPublicProviders(req, res);

      assert(responseData && responseData.success === true, 'getPublicProviders succeeded');
      const providers = responseData.data.providers;
      assert(providers.length === 1, `Returned only 1 provider, filtered out Admin (got ${providers.length})`);
      assert(providers[0].user?.name === 'Rahul' && providers[0].businessName === 'CoolCare Solutions', 'Returned legitimate technician');
      assert(providers[0].profession === 'AC Technician', 'Returned profession');
    } finally {
      ProviderProfile.find = origFind;
      ProviderProfile.countDocuments = origCount;
    }
  }

  console.log('\n============================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED WITH ZERO FAILURES!`);
  console.log('============================================================\n');
}

runAllTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
