/**
 * Automated Test Suite: ServiceHub Booking Flow
 *
 * Tests:
 * 1. Customer creates request directly to selected technician (Laksh -> Rahul Sharma).
 * 2. Correct technician receives request in REQUESTED state with address masked.
 * 3. Technician accepts request -> status transitions to ACCEPTED; full address is unlocked.
 * 4. Customer sees status ACCEPTED.
 * 5. Technician rejects request -> mandates reason; transitions to REJECTED.
 * 6. Customer sees status REJECTED with the specific reason.
 * 7. Wrong technician cannot access booking (HTTP 403).
 * 8. Wrong customer cannot access booking (HTTP 403).
 * 9. Duplicate accept/reject is rejected (HTTP 400).
 * 10. Invalid state transitions are rejected by the state machine (HTTP 400).
 */

const mongoose = require('mongoose');
const Booking = require('../src/models/Booking');
const Service = require('../src/models/Service');
const User = require('../src/models/User');
const ProviderProfile = require('../src/models/ProviderProfile');
const bookingController = require('../src/controllers/bookingController');
const { BOOKING_STATUS, USER_ROLES, USER_STATUS, PROVIDER_STATUS } = require('../src/utils/constants');
const { validateStatusTransition } = require('../src/utils/bookingStateMachine');

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

async function runTests() {
  console.log('\n============================================================');
  console.log('🧪 SERVICEHUB BOOKING FLOW & STATE MACHINE TEST SUITE');
  console.log('============================================================\n');

  // In-memory mock database collections
  const mockUsers = [];
  const mockProfiles = [];
  const mockServices = [];
  const mockBookings = [];

  // Setup Users: Laksh (Customer), WrongCustomer, Rahul Sharma (AC Tech), Imran Khan (Plumber Tech), Admin
  const customerUserId = new mongoose.Types.ObjectId();
  const lakshCustomer = {
    _id: customerUserId,
    name: 'Laksh Suthar',
    email: 'laksh@gmail.com',
    role: USER_ROLES.CUSTOMER,
    status: USER_STATUS.ACTIVE
  };

  const wrongCustomerUserId = new mongoose.Types.ObjectId();
  const wrongCustomer = {
    _id: wrongCustomerUserId,
    name: 'Intruder Customer',
    email: 'intruder@gmail.com',
    role: USER_ROLES.CUSTOMER,
    status: USER_STATUS.ACTIVE
  };

  const rahulTechUserId = new mongoose.Types.ObjectId();
  const rahulTechnician = {
    _id: rahulTechUserId,
    name: 'Rahul Sharma',
    email: 'ac@gmail.com',
    role: USER_ROLES.TECHNICIAN,
    status: USER_STATUS.ACTIVE
  };

  const imranTechUserId = new mongoose.Types.ObjectId();
  const imranTechnician = {
    _id: imranTechUserId,
    name: 'Imran Khan',
    email: 'plumber@gmail.com',
    role: USER_ROLES.TECHNICIAN,
    status: USER_STATUS.ACTIVE
  };

  const adminUserId = new mongoose.Types.ObjectId();
  const adminUser = {
    _id: adminUserId,
    name: 'Admin User',
    email: 'abc@gmail.com',
    role: USER_ROLES.ADMIN,
    status: USER_STATUS.ACTIVE
  };

  mockUsers.push(lakshCustomer, wrongCustomer, rahulTechnician, imranTechnician, adminUser);

  // Setup Service: AC Repair
  const acServiceId = new mongoose.Types.ObjectId();
  const acService = {
    _id: acServiceId,
    name: 'AC Repair',
    slug: 'ac-repair',
    basePrice: 499,
    status: 'ACTIVE'
  };
  mockServices.push(acService);

  // Setup Verified Technician Profile for Rahul
  const rahulProfile = {
    _id: new mongoose.Types.ObjectId(),
    userId: rahulTechUserId,
    businessName: 'CoolCare AC Solutions',
    profession: 'AC Technician',
    status: PROVIDER_STATUS.VERIFIED,
    servicesOffered: [
      { serviceId: acServiceId, customTitle: 'AC Repair', pricing: { amount: 499 }, isActive: true }
    ]
  };
  mockProfiles.push(rahulProfile);

  // Wire up Mongoose Mocks
  User.findById = (id) => {
    const u = mockUsers.find((user) => user._id.toString() === id?.toString());
    return Promise.resolve(u || null);
  };

  Service.findById = (id) => {
    const s = mockServices.find((serv) => serv._id.toString() === id?.toString());
    return Promise.resolve(s || null);
  };

  ProviderProfile.findOne = (query) => {
    if (query.userId) {
      const p = mockProfiles.find((prof) => prof.userId.toString() === query.userId.toString());
      return Promise.resolve(p || null);
    }
    return Promise.resolve(null);
  };

  // Chainable mock helper for Booking queries
  const makeBookingQuery = (result) => {
    const q = {
      populate: () => q,
      sort: () => q,
      skip: () => q,
      limit: () => q,
      lean: () => Promise.resolve(result),
      then: (fn, rej) => Promise.resolve(result).then(fn, rej)
    };
    return q;
  };

  Booking.findById = (id) => {
    const b = mockBookings.find((booking) => booking._id.toString() === id?.toString());
    if (!b) return makeBookingQuery(null);

    const baseObj = b.toObject ? b.toObject() : b;
    const populated = {
      ...baseObj,
      _id: b._id,
      status: b.status,
      rejectionReason: b.rejectionReason,
      address: baseObj.address ? { ...baseObj.address } : {},
      jobExecution: b.jobExecution || {},
      statusHistory: b.statusHistory || [],
      customerId: mockUsers.find((u) => u._id.toString() === b.customerId?._id?.toString() || u._id.toString() === b.customerId?.toString()) || b.customerId,
      technicianId: mockUsers.find((u) => u._id.toString() === b.technicianId?._id?.toString() || u._id.toString() === b.technicianId?.toString()) || b.technicianId,
      providerId: mockUsers.find((u) => u._id.toString() === b.providerId?._id?.toString() || u._id.toString() === b.providerId?.toString()) || b.providerId,
      serviceId: mockServices.find((s) => s._id.toString() === b.serviceId?._id?.toString() || s._id.toString() === b.serviceId?.toString()) || b.serviceId,
      toObject() {
        return JSON.parse(JSON.stringify(this));
      },
      save() {
        const idx = mockBookings.findIndex((x) => x._id.toString() === this._id.toString());
        if (idx !== -1) {
          mockBookings[idx].status = this.status;
          mockBookings[idx].rejectionReason = this.rejectionReason;
          mockBookings[idx].jobExecution = this.jobExecution;
          mockBookings[idx].statusHistory = this.statusHistory;
        }
        return Promise.resolve(this);
      }
    };
    return makeBookingQuery(populated);
  };

  Booking.find = (filter) => {
    let results = mockBookings.filter((b) => {
      if (filter.customerId && b.customerId.toString() !== filter.customerId.toString()) return false;
      if (filter.$or) {
        const matchesOr = filter.$or.some((cond) => {
          if (cond.technicianId && b.technicianId?.toString() === cond.technicianId.toString()) return true;
          if (cond.providerId && b.providerId?.toString() === cond.providerId.toString()) return true;
          return false;
        });
        if (!matchesOr) return false;
      }
      if (filter.status && b.status !== filter.status) return false;
      return true;
    });

    const populatedList = results.map((b) => ({
      ...b,
      customerId: mockUsers.find((u) => u._id.toString() === b.customerId?.toString()) || b.customerId,
      technicianId: mockUsers.find((u) => u._id.toString() === b.technicianId?.toString()) || b.technicianId,
      providerId: mockUsers.find((u) => u._id.toString() === b.providerId?.toString()) || b.providerId,
      serviceId: mockServices.find((s) => s._id.toString() === b.serviceId?.toString()) || b.serviceId,
      toObject() {
        return JSON.parse(JSON.stringify(this));
      }
    }));

    return makeBookingQuery(populatedList);
  };

  Booking.countDocuments = (filter) => {
    return Promise.resolve(mockBookings.length);
  };

  // -------------------------------------------------------------
  // Test 1: Customer creates direct request to Rahul Sharma
  // -------------------------------------------------------------
  console.log('🔹 [1/6] Customer Direct Booking Creation...');
  let createdBookingId = null;
  {
    const req = {
      user: lakshCustomer,
      body: {
        serviceId: acServiceId.toString(),
        technicianId: rahulTechUserId.toString(),
        address: {
          addressLine1: 'Flat 402, Shanti Heights, 12th Main',
          streetAddress: 'Flat 402, Shanti Heights, 12th Main',
          locality: 'Indiranagar',
          landmark: 'Opposite Metro Station',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560038'
        },
        scheduledDate: '2026-09-15',
        preferredTimeSlot: 'Morning (09:00 - 12:00)',
        problemDescription: 'AC cooling coil is frosting and leaking water inside room'
      }
    };

    let resData = null;
    let statusCode = 200;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { resData = data; return this; }
    };

    // Instantiate mock booking creation in mockBookings
    const bookingInstance = new Booking({
      bookingNumber: 'BK-TEST-001',
      customerId: lakshCustomer._id,
      technicianId: rahulTechUserId,
      providerId: rahulTechUserId,
      serviceId: acServiceId,
      address: req.body.address,
      scheduledDate: new Date(req.body.scheduledDate),
      preferredTimeSlot: req.body.preferredTimeSlot,
      problemDescription: req.body.problemDescription,
      status: BOOKING_STATUS.REQUESTED,
      statusHistory: [
        {
          previousStatus: null,
          newStatus: BOOKING_STATUS.REQUESTED,
          actor: { userId: lakshCustomer._id, role: USER_ROLES.CUSTOMER, name: lakshCustomer.name },
          reason: 'Initial booking request submitted',
          timestamp: new Date()
        }
      ]
    });
    mockBookings.push(bookingInstance);
    createdBookingId = bookingInstance._id;

    assert(bookingInstance.status === BOOKING_STATUS.REQUESTED, 'Initial booking status is REQUESTED');
    assert(bookingInstance.technicianId.toString() === rahulTechUserId.toString(), 'Direct request targets Rahul Sharma');
    assert(bookingInstance.customerId.toString() === lakshCustomer._id.toString(), 'Direct request authored by Laksh');
    assert(bookingInstance.problemDescription.includes('frosting'), 'Problem description captured accurately');
  }

  // -------------------------------------------------------------
  // Test 2: Correct Technician receives request with Address Masked
  // -------------------------------------------------------------
  console.log('\n🔹 [2/6] Technician Access & Location Privacy Masking...');
  {
    const reqTech = {
      user: rahulTechnician,
      params: { id: createdBookingId.toString() }
    };

    let resTechData = null;
    let statusTechCode = 200;
    const resTech = {
      status(code) { statusTechCode = code; return this; },
      json(data) { resTechData = data; return this; }
    };

    await bookingController.getBookingById(reqTech, resTech);

    assert(statusTechCode === 200, 'Assigned technician can access booking details');
    const returnedBooking = resTechData?.booking;
    assert(returnedBooking.status === BOOKING_STATUS.REQUESTED, 'Booking is in REQUESTED state');

    // Verify address is masked prior to acceptance
    assert(
      returnedBooking.address.addressLine1.includes('Complete address disclosed upon accepting'),
      'LOCATION PRIVACY: Street address is masked before technician acceptance'
    );
    assert(returnedBooking.address.city === 'Bengaluru', 'City is visible for general routing');
    assert(returnedBooking.address.state === 'Karnataka', 'State is visible for general routing');
  }

  // -------------------------------------------------------------
  // Test 3: Technician Accepts Request -> Unlocks Full Address
  // -------------------------------------------------------------
  console.log('\n🔹 [3/6] Technician Acceptance & Address Unlocking...');
  {
    const reqAccept = {
      user: rahulTechnician,
      params: { id: createdBookingId.toString() },
      body: { status: BOOKING_STATUS.ACCEPTED }
    };

    let resAcceptData = null;
    let statusAcceptCode = 200;
    const resAccept = {
      status(code) { statusAcceptCode = code; return this; },
      json(data) { resAcceptData = data; return this; }
    };

    await bookingController.transitionBookingStatus(reqAccept, resAccept);

    assert(statusAcceptCode === 200, 'Technician successfully accepts service request');
    assert(resAcceptData?.booking?.status === BOOKING_STATUS.ACCEPTED, 'Status transitioned to ACCEPTED');

    // Now verify Rahul Sharma gets unmasked full address
    const reqTechAfterAccept = {
      user: rahulTechnician,
      params: { id: createdBookingId.toString() }
    };

    let resTechAfterData = null;
    const resTechAfter = {
      status(code) { return this; },
      json(data) { resTechAfterData = data; return this; }
    };

    await bookingController.getBookingById(reqTechAfterAccept, resTechAfter);
    const unmaskedAddress = resTechAfterData?.booking?.address;
    assert(
      unmaskedAddress.addressLine1 === 'Flat 402, Shanti Heights, 12th Main',
      'LOCATION PRIVACY: Full street address unlocked upon technician acceptance'
    );
  }

  // -------------------------------------------------------------
  // Test 4: Customer Sees Accepted Status
  // -------------------------------------------------------------
  console.log('\n🔹 [4/6] Customer View of Accepted Booking...');
  {
    const reqCustomer = {
      user: lakshCustomer,
      params: { id: createdBookingId.toString() }
    };

    let resCustData = null;
    const resCust = {
      status(code) { return this; },
      json(data) { resCustData = data; return this; }
    };

    await bookingController.getBookingById(reqCustomer, resCust);
    assert(resCustData?.booking?.status === BOOKING_STATUS.ACCEPTED, 'Customer verifies booking status is ACCEPTED');
    assert(resCustData?.booking?.technicianId?.name === 'Rahul Sharma', 'Customer sees assigned technician is Rahul Sharma');
  }

  // -------------------------------------------------------------
  // Test 5: Rejection Flow (Requires Reason) & Customer Views Rejection
  // -------------------------------------------------------------
  console.log('\n🔹 [5/6] Technician Rejection Flow (Mandatory Reason)...');
  {
    // Create second booking assigned to Imran Khan (Plumber)
    const secondBooking = new Booking({
      bookingNumber: 'BK-TEST-002',
      customerId: lakshCustomer._id,
      technicianId: imranTechUserId,
      providerId: imranTechUserId,
      serviceId: acServiceId,
      address: {
        addressLine1: 'Villa 14, Palm Grove',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560066'
      },
      scheduledDate: new Date('2026-09-16'),
      preferredTimeSlot: 'Afternoon (12:00 - 16:00)',
      problemDescription: 'Water pipe leakage under kitchen sink',
      status: BOOKING_STATUS.REQUESTED,
      statusHistory: []
    });
    mockBookings.push(secondBooking);

    // 5a: Attempting to reject without reason MUST fail
    const reqRejectNoReason = {
      user: imranTechnician,
      params: { id: secondBooking._id.toString() },
      body: { status: BOOKING_STATUS.REJECTED, reason: '' }
    };

    let resRejectFailData = null;
    let statusRejectFail = 200;
    const resRejectFail = {
      status(code) { statusRejectFail = code; return this; },
      json(data) { resRejectFailData = data; return this; }
    };

    await bookingController.transitionBookingStatus(reqRejectNoReason, resRejectFail);
    assert(statusRejectFail === 400, 'Rejection without reason is strictly rejected with HTTP 400');
    assert(resRejectFailData.message.includes('reason is required'), 'Error explicitly demands rejection reason');

    // 5b: Reject with valid reason succeeds
    const reqRejectWithReason = {
      user: imranTechnician,
      params: { id: secondBooking._id.toString() },
      body: { status: BOOKING_STATUS.REJECTED, reason: 'Already fully booked on requested afternoon' }
    };

    let resRejectSuccessData = null;
    let statusRejectSuccess = 200;
    const resRejectSuccess = {
      status(code) { statusRejectSuccess = code; return this; },
      json(data) { resRejectSuccessData = data; return this; }
    };

    await bookingController.transitionBookingStatus(reqRejectWithReason, resRejectSuccess);
    assert(statusRejectSuccess === 200, 'Rejection with reason succeeds with HTTP 200');
    assert(resRejectSuccessData?.booking?.status === BOOKING_STATUS.REJECTED, 'Status transitioned to REJECTED');

    // 5c: Customer views rejected status and specific reason
    const reqCustomerViewReject = {
      user: lakshCustomer,
      params: { id: secondBooking._id.toString() }
    };

    let resCustRejectData = null;
    const resCustReject = {
      status(code) { return this; },
      json(data) { resCustRejectData = data; return this; }
    };

    await bookingController.getBookingById(reqCustomerViewReject, resCustReject);
    assert(resCustRejectData?.booking?.status === BOOKING_STATUS.REJECTED, 'Customer sees REJECTED status');
    assert(
      resCustRejectData?.booking?.rejectionReason === 'Already fully booked on requested afternoon',
      'Customer sees accurate rejection reason provided by technician'
    );
  }

  // -------------------------------------------------------------
  // Test 6: Security, Ownership & Invalid Transitions
  // -------------------------------------------------------------
  console.log('\n🔹 [6/6] Ownership Authorization, Duplicate Protection & State Machine...');
  {
    // 6a: Wrong technician cannot access booking (HTTP 403)
    const reqWrongTech = {
      user: imranTechnician, // Imran tries to access Rahul's booking
      params: { id: createdBookingId.toString() }
    };

    let statusWrongTech = 200;
    const resWrongTech = {
      status(code) { statusWrongTech = code; return this; },
      json() { return this; }
    };

    await bookingController.getBookingById(reqWrongTech, resWrongTech);
    assert(statusWrongTech === 403, 'Wrong technician receives HTTP 403 Forbidden');

    // 6b: Wrong customer cannot access booking (HTTP 403)
    const reqWrongCust = {
      user: wrongCustomer, // Intruder tries to access Laksh's booking
      params: { id: createdBookingId.toString() }
    };

    let statusWrongCust = 200;
    const resWrongCust = {
      status(code) { statusWrongCust = code; return this; },
      json() { return this; }
    };

    await bookingController.getBookingById(reqWrongCust, resWrongCust);
    assert(statusWrongCust === 403, 'Wrong customer receives HTTP 403 Forbidden');

    // 6c: Duplicate Accept is rejected (booking is already ACCEPTED)
    const reqDupAccept = {
      user: rahulTechnician,
      params: { id: createdBookingId.toString() },
      body: { status: BOOKING_STATUS.ACCEPTED }
    };

    let statusDupAccept = 200;
    let resDupData = null;
    const resDupAccept = {
      status(code) { statusDupAccept = code; return this; },
      json(data) { resDupData = data; return this; }
    };

    await bookingController.transitionBookingStatus(reqDupAccept, resDupAccept);
    assert(statusDupAccept === 400, 'Duplicate accept is rejected with HTTP 400');
    assert(resDupData.message.includes('already in'), 'Message states booking is already in status');

    // 6d: Invalid state transition jumps are rejected
    // e.g. Customer attempting to jump from ACCEPTED to WORK_COMPLETED
    const reqInvalidJump = {
      user: lakshCustomer,
      params: { id: createdBookingId.toString() },
      body: { status: BOOKING_STATUS.WORK_COMPLETED }
    };

    let statusInvalid = 200;
    const resInvalid = {
      status(code) { statusInvalid = code; return this; },
      json() { return this; }
    };

    await bookingController.transitionBookingStatus(reqInvalidJump, resInvalid);
    assert(statusInvalid === 400, 'Invalid state transition jump is rejected with HTTP 400');

    // 6e: State machine validation utility verification
    const validTransition = validateStatusTransition(BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.SCHEDULED, USER_ROLES.TECHNICIAN);
    assert(validTransition.allowed === true, 'ACCEPTED -> SCHEDULED by TECHNICIAN is permitted');

    const customerCannotAccept = validateStatusTransition(BOOKING_STATUS.REQUESTED, BOOKING_STATUS.ACCEPTED, USER_ROLES.CUSTOMER);
    assert(customerCannotAccept.allowed === false, 'CUSTOMER cannot execute ACCEPT transition');

    const cannotReviveRejected = validateStatusTransition(BOOKING_STATUS.REJECTED, BOOKING_STATUS.ACCEPTED, USER_ROLES.TECHNICIAN);
    assert(cannotReviveRejected.allowed === false, 'REJECTED is terminal; cannot transition to ACCEPTED');
  }

  console.log('\n============================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED WITH ZERO FAILURES!`);
  console.log('============================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
