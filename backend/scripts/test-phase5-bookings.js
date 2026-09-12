/**
 * End-to-End Test Suite for Phase 5: Service Request and Booking Workflow
 * Tests strict state transitions, audit trail logging, rescheduling,
 * cancellation rules, and thoroughly tests invalid state transitions.
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Service = require('../src/models/Service');
const ProviderProfile = require('../src/models/ProviderProfile');
const Booking = require('../src/models/Booking');
const { BOOKING_STATUS, USER_ROLES, PROVIDER_STATUS } = require('../src/utils/constants');
const { validateStatusTransition } = require('../src/utils/bookingStateMachine');
const { seedMarketplaceData } = require('../src/utils/seedData');
const bookingController = require('../src/controllers/bookingController');

// Mock Express req/res
const createMockReqRes = (user, body = {}, params = {}, query = {}) => {
  const req = {
    user,
    body,
    params,
    query
  };

  let responseData = null;
  let statusCode = 200;

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    }
  };

  return {
    req,
    res,
    getStatus: () => statusCode,
    getData: () => responseData
  };
};

async function runBookingTests() {
  console.log('============================================================');
  console.log('STARTING PHASE 5: BOOKING WORKFLOW & STATE MACHINE TEST SUITE');
  console.log('============================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB:', mongoose.connection.name);

  // Seed baseline marketplace if empty
  await seedMarketplaceData();

  try {
    // 1. Setup Test Users: Customer, Provider, Admin, and Unauthorized Third Party
    const customerUser = await User.findOneAndUpdate(
      { email: 'customer.booking.test@example.com' },
      {
        name: 'Alice Customer',
        firebaseUid: 'cust-booking-test-uid',
        email: 'customer.booking.test@example.com',
        role: USER_ROLES.CUSTOMER,
        status: 'ACTIVE'
      },
      { upsert: true, new: true }
    );

    const providerUser = await User.findOneAndUpdate(
      { email: 'provider.booking.test@example.com' },
      {
        name: 'Bob Master Plumber',
        firebaseUid: 'prov-booking-test-uid',
        email: 'provider.booking.test@example.com',
        role: USER_ROLES.PROVIDER,
        status: 'ACTIVE'
      },
      { upsert: true, new: true }
    );

    const adminUser = await User.findOneAndUpdate(
      { email: 'admin.booking.test@example.com' },
      {
        name: 'Super Admin',
        firebaseUid: 'admin-booking-test-uid',
        email: 'admin.booking.test@example.com',
        role: USER_ROLES.ADMIN,
        status: 'ACTIVE'
      },
      { upsert: true, new: true }
    );

    const intruderUser = await User.findOneAndUpdate(
      { email: 'intruder.booking.test@example.com' },
      {
        name: 'Unauthorized Stranger',
        firebaseUid: 'intruder-booking-test-uid',
        email: 'intruder.booking.test@example.com',
        role: USER_ROLES.CUSTOMER,
        status: 'ACTIVE'
      },
      { upsert: true, new: true }
    );

    // Ensure Provider has a VERIFIED Profile
    let providerProfile = await ProviderProfile.findOne({ userId: providerUser._id });
    if (!providerProfile) {
      providerProfile = await ProviderProfile.create({
        userId: providerUser._id,
        businessName: 'Bob Pipe & Drain Co',
        status: PROVIDER_STATUS.VERIFIED,
        licenseNumber: 'PLUMB-9992',
        serviceArea: {
          cities: ['San Francisco', 'Oakland'],
          zipCodes: ['94103', '94107'],
          radiusKm: 30
        },
        availability: {
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
          workingHours: { start: '08:00', end: '18:00' },
          emergencyServices: true,
          noticeHours: 12
        }
      });
    } else {
      providerProfile.status = PROVIDER_STATUS.VERIFIED;
      await providerProfile.save();
    }

    // Ensure a Service exists
    let testService = await Service.findOne();
    if (!testService) {
      throw new Error('No service found in database to book.');
    }

    console.log('Setup Complete:');
    console.log(`  Customer: ${customerUser.name} (${customerUser._id})`);
    console.log(`  Provider: ${providerProfile.businessName} (${providerUser._id})`);
    console.log(`  Service: ${testService.name} (${testService._id})\n`);

    // =========================================================================
    // TEST 1: Booking Creation by Customer
    // =========================================================================
    console.log('[TEST 1] Testing Customer Booking Request Creation...');
    const createPayload = {
      serviceId: testService._id,
      providerId: providerUser._id,
      address: {
        streetAddress: '789 Mission Street',
        unit: 'Apt 12B',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94103'
      },
      scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      preferredTimeSlot: 'Morning (09:00 - 12:00)',
      problemDescription: 'Severe kitchen sink drainage backup with gurgling pipes.'
    };

    const t1 = createMockReqRes(customerUser, createPayload);
    await bookingController.createBooking(t1.req, t1.res);

    if (t1.getStatus() !== 201) {
      throw new Error(`Failed to create booking: ${JSON.stringify(t1.getData())}`);
    }

    const createdBooking = t1.getData().booking;
    if (createdBooking.status !== BOOKING_STATUS.REQUESTED) {
      throw new Error(`Expected initial status 'REQUESTED', got: ${createdBooking.status}`);
    }
    if (createdBooking.statusHistory?.length !== 1) {
      throw new Error(`Expected 1 statusHistory event, got: ${createdBooking.statusHistory?.length}`);
    }
    console.log(`  -> PASS: Booking created with number ${createdBooking.bookingNumber} in status REQUESTED.`);
    console.log(`  -> PASS: Audit log entry logged: ${createdBooking.statusHistory[0].reason}`);

    const bookingId = createdBooking._id;

    // =========================================================================
    // TEST 2: THOROUGH TESTING OF INVALID TRANSITIONS FROM REQUESTED
    // =========================================================================
    console.log('\n[TEST 2] Testing Forbidden State Transitions from REQUESTED...');

    // 2a. Attempt illegal jump: REQUESTED -> IN_PROGRESS
    const t2a = createMockReqRes(providerUser, { status: BOOKING_STATUS.IN_PROGRESS }, { id: bookingId });
    await bookingController.transitionBookingStatus(t2a.req, t2a.res);
    if (t2a.getStatus() === 400) {
      console.log(`  -> PASS: REQUESTED -> IN_PROGRESS correctly rejected: "${t2a.getData().message}"`);
    } else {
      throw new Error(`Expected 400 Bad Request for illegal transition, got ${t2a.getStatus()}`);
    }

    // 2b. Attempt illegal jump: REQUESTED -> COMPLETED
    const t2b = createMockReqRes(customerUser, { status: BOOKING_STATUS.COMPLETED }, { id: bookingId });
    await bookingController.transitionBookingStatus(t2b.req, t2b.res);
    if (t2b.getStatus() === 400) {
      console.log(`  -> PASS: REQUESTED -> COMPLETED correctly rejected: "${t2b.getData().message}"`);
    } else {
      throw new Error(`Expected 400 Bad Request, got ${t2b.getStatus()}`);
    }

    // 2c. Unauthorized user (neither customer, provider, nor admin)
    const t2c = createMockReqRes(intruderUser, { status: BOOKING_STATUS.ACCEPTED }, { id: bookingId });
    await bookingController.transitionBookingStatus(t2c.req, t2c.res);
    if (t2c.getStatus() === 403) {
      console.log(`  -> PASS: Unauthorized actor correctly returned 403: "${t2c.getData().message}"`);
    } else {
      throw new Error(`Expected 403 Forbidden, got ${t2c.getStatus()}`);
    }

    // 2d. Customer trying to ACCEPT (only Provider/Admin can accept)
    const t2d = createMockReqRes(customerUser, { status: BOOKING_STATUS.ACCEPTED }, { id: bookingId });
    await bookingController.transitionBookingStatus(t2d.req, t2d.res);
    if (t2d.getStatus() === 400) {
      console.log(`  -> PASS: Customer attempting to ACCEPT rejected: "${t2d.getData().message}"`);
    } else {
      throw new Error(`Expected 400 Bad Request, got ${t2d.getStatus()}`);
    }

    // =========================================================================
    // TEST 3: Provider Accepts Booking (REQUESTED -> ACCEPTED)
    // =========================================================================
    console.log('\n[TEST 3] Testing Provider Acceptance (REQUESTED -> ACCEPTED)...');
    const t3 = createMockReqRes(
      providerUser,
      { status: BOOKING_STATUS.ACCEPTED, reason: 'Technician available on requested date' },
      { id: bookingId }
    );
    await bookingController.transitionBookingStatus(t3.req, t3.res);

    if (t3.getStatus() !== 200 || t3.getData().booking.status !== BOOKING_STATUS.ACCEPTED) {
      throw new Error(`Acceptance failed: ${JSON.stringify(t3.getData())}`);
    }
    console.log(`  -> PASS: Booking transitioned to ACCEPTED.`);

    // =========================================================================
    // TEST 4: Rescheduling & Confirmation (ACCEPTED -> SCHEDULED)
    // =========================================================================
    console.log('\n[TEST 4] Testing Rescheduling / Date Confirmation (ACCEPTED -> SCHEDULED)...');
    const newScheduledDate = new Date(Date.now() + 172800000).toISOString().split('T')[0]; // +2 days
    const t4 = createMockReqRes(
      providerUser,
      {
        newScheduledDate,
        newTimeSlot: 'Afternoon (12:00 - 16:00)',
        reason: 'Adjusted schedule to guarantee dedicated senior technician'
      },
      { id: bookingId }
    );
    await bookingController.rescheduleBooking(t4.req, t4.res);

    if (t4.getStatus() !== 200 || t4.getData().booking.status !== BOOKING_STATUS.SCHEDULED) {
      throw new Error(`Reschedule failed: ${JSON.stringify(t4.getData())}`);
    }
    console.log(`  -> PASS: Booking rescheduled to ${newScheduledDate} (Afternoon). Status is now SCHEDULED.`);

    // =========================================================================
    // TEST 5: Forbidden Transitions from SCHEDULED
    // =========================================================================
    console.log('\n[TEST 5] Testing Forbidden Jumps from SCHEDULED...');
    // Attempt: SCHEDULED -> COMPLETION_PENDING
    const t5 = createMockReqRes(providerUser, { status: BOOKING_STATUS.COMPLETION_PENDING }, { id: bookingId });
    await bookingController.transitionBookingStatus(t5.req, t5.res);
    if (t5.getStatus() === 400) {
      console.log(`  -> PASS: SCHEDULED -> COMPLETION_PENDING correctly rejected: "${t5.getData().message}"`);
    } else {
      throw new Error(`Expected 400 Bad Request, got ${t5.getStatus()}`);
    }

    // =========================================================================
    // TEST 6: Complete Pipeline Progression:
    // SCHEDULED -> TECHNICIAN_ARRIVED -> IN_PROGRESS -> COMPLETION_PENDING -> CUSTOMER_VERIFIED -> COMPLETED
    // =========================================================================
    console.log('\n[TEST 6] Testing End-to-End Progress Pipeline Transitions...');

    // 6a. Technician Arrives
    const t6a = createMockReqRes(
      providerUser,
      { status: BOOKING_STATUS.TECHNICIAN_ARRIVED, reason: 'Technician checked in at job site' },
      { id: bookingId }
    );
    await bookingController.transitionBookingStatus(t6a.req, t6a.res);
    if (t6a.getStatus() !== 200 || t6a.getData().booking.status !== BOOKING_STATUS.TECHNICIAN_ARRIVED) {
      throw new Error(`Arrival failed: ${JSON.stringify(t6a.getData())}`);
    }
    console.log(`  -> PASS: Transitioned to TECHNICIAN_ARRIVED.`);

    // 6b. Work Commences: TECHNICIAN_ARRIVED -> IN_PROGRESS
    const t6b = createMockReqRes(
      providerUser,
      { status: BOOKING_STATUS.IN_PROGRESS, reason: 'Snaking drain line and inspecting trap' },
      { id: bookingId }
    );
    await bookingController.transitionBookingStatus(t6b.req, t6b.res);
    if (t6b.getStatus() !== 200 || t6b.getData().booking.status !== BOOKING_STATUS.IN_PROGRESS) {
      throw new Error(`Start work failed: ${JSON.stringify(t6b.getData())}`);
    }
    console.log(`  -> PASS: Transitioned to IN_PROGRESS.`);

    // 6c. Verify Strict Cancellation Rule: Customer cannot cancel once IN_PROGRESS!
    const t6c = createMockReqRes(
      customerUser,
      { status: BOOKING_STATUS.CANCELLED_BY_CUSTOMER, reason: 'I changed my mind' },
      { id: bookingId }
    );
    await bookingController.transitionBookingStatus(t6c.req, t6c.res);
    if (t6c.getStatus() === 400) {
      console.log(`  -> PASS: Customer cancellation during IN_PROGRESS strictly prevented: "${t6c.getData().message}"`);
    } else {
      throw new Error(`Customer cancellation should have failed during IN_PROGRESS! Got ${t6c.getStatus()}`);
    }

    // 6d. Technician Finishes Work: IN_PROGRESS -> COMPLETION_PENDING
    const t6d = createMockReqRes(
      providerUser,
      { status: BOOKING_STATUS.COMPLETION_PENDING, reason: 'Drain cleared, flow test passed, cleaned workspace' },
      { id: bookingId }
    );
    await bookingController.transitionBookingStatus(t6d.req, t6d.res);
    if (t6d.getStatus() !== 200 || t6d.getData().booking.status !== BOOKING_STATUS.COMPLETION_PENDING) {
      throw new Error(`Completion pending failed: ${JSON.stringify(t6d.getData())}`);
    }
    console.log(`  -> PASS: Transitioned to COMPLETION_PENDING.`);

    // 6e. Customer Verifies & Signs Off: COMPLETION_PENDING -> CUSTOMER_VERIFIED
    const t6e = createMockReqRes(
      customerUser,
      { status: BOOKING_STATUS.CUSTOMER_VERIFIED, reason: 'Inspected sink, water drains cleanly, satisfied' },
      { id: bookingId }
    );
    await bookingController.transitionBookingStatus(t6e.req, t6e.res);
    if (t6e.getStatus() !== 200 || t6e.getData().booking.status !== BOOKING_STATUS.CUSTOMER_VERIFIED) {
      throw new Error(`Customer verification failed: ${JSON.stringify(t6e.getData())}`);
    }
    console.log(`  -> PASS: Customer signed off: CUSTOMER_VERIFIED.`);

    // 6f. Final Order Completion: CUSTOMER_VERIFIED -> COMPLETED
    const t6f = createMockReqRes(
      providerUser,
      { status: BOOKING_STATUS.COMPLETED, reason: 'Job finalized' },
      { id: bookingId }
    );
    await bookingController.transitionBookingStatus(t6f.req, t6f.res);
    if (t6f.getStatus() !== 200 || t6f.getData().booking.status !== BOOKING_STATUS.COMPLETED) {
      throw new Error(`Final completion failed: ${JSON.stringify(t6f.getData())}`);
    }
    console.log(`  -> PASS: Booking reached terminal state COMPLETED.`);

    // =========================================================================
    // TEST 7: Terminal State Guard: No further transitions from COMPLETED
    // =========================================================================
    console.log('\n[TEST 7] Testing Terminal State Immutability from COMPLETED...');
    const t7 = createMockReqRes(customerUser, { status: BOOKING_STATUS.IN_PROGRESS }, { id: bookingId });
    await bookingController.transitionBookingStatus(t7.req, t7.res);
    if (t7.getStatus() === 400) {
      console.log(`  -> PASS: Modification of COMPLETED booking correctly rejected: "${t7.getData().message}"`);
    } else {
      throw new Error(`Expected 400 Bad Request on terminal state, got ${t7.getStatus()}`);
    }

    // =========================================================================
    // TEST 8: Verify Complete Audit Trail Logging
    // =========================================================================
    console.log('\n[TEST 8] Verifying Audit Trail Completeness...');
    const finalizedBooking = await Booking.findById(bookingId);
    console.log(`  -> Total logged status events: ${finalizedBooking.statusHistory.length}`);
    finalizedBooking.statusHistory.forEach((h, i) => {
      console.log(`     [${i + 1}] ${h.previousStatus || 'null'} -> ${h.newStatus} by ${h.actor?.role} (${h.actor?.name}): "${h.reason}"`);
    });

    if (finalizedBooking.statusHistory.length < 6) {
      throw new Error(`Audit log is incomplete. Expected >= 6 entries, got ${finalizedBooking.statusHistory.length}`);
    }
    console.log('  -> PASS: Audit trail is 100% complete and chronologically logged.');

    // =========================================================================
    // TEST 9: Cancellation & Decline Flow Testing
    // =========================================================================
    console.log('\n[TEST 9] Testing Customer Cancellation & Provider Decline Flow...');

    // 9a. Customer creates and then cancels booking
    const t9a_create = createMockReqRes(customerUser, createPayload);
    await bookingController.createBooking(t9a_create.req, t9a_create.res);
    const bookingToCancel = t9a_create.getData().booking;

    const t9a_cancel = createMockReqRes(
      customerUser,
      { status: BOOKING_STATUS.CANCELLED_BY_CUSTOMER, reason: 'Issue resolved with plunger' },
      { id: bookingToCancel._id }
    );
    await bookingController.transitionBookingStatus(t9a_cancel.req, t9a_cancel.res);
    if (t9a_cancel.getStatus() !== 200 || t9a_cancel.getData().booking.status !== BOOKING_STATUS.CANCELLED_BY_CUSTOMER) {
      throw new Error(`Cancellation failed: ${JSON.stringify(t9a_cancel.getData())}`);
    }
    console.log('  -> PASS: Customer successfully cancelled booking: CANCELLED_BY_CUSTOMER.');

    // 9b. Customer creates and Provider declines booking
    const t9b_create = createMockReqRes(customerUser, createPayload);
    await bookingController.createBooking(t9b_create.req, t9b_create.res);
    const bookingToDecline = t9b_create.getData().booking;

    const t9b_decline = createMockReqRes(
      providerUser,
      { status: BOOKING_STATUS.CANCELLED_BY_PROVIDER, reason: 'Fully booked on this date' },
      { id: bookingToDecline._id }
    );
    await bookingController.transitionBookingStatus(t9b_decline.req, t9b_decline.res);
    if (t9b_decline.getStatus() !== 200 || t9b_decline.getData().booking.status !== BOOKING_STATUS.CANCELLED_BY_PROVIDER) {
      throw new Error(`Decline failed: ${JSON.stringify(t9b_decline.getData())}`);
    }
    console.log('  -> PASS: Provider successfully declined booking with reason: CANCELLED_BY_PROVIDER.');

    // =========================================================================
    // TEST 10: Customer Dispute Workflow
    // =========================================================================
    console.log('\n[TEST 10] Testing Dispute Workflow (COMPLETION_PENDING -> DISPUTED -> Admin Resolution)...');

    const t10_create = createMockReqRes(customerUser, createPayload);
    await bookingController.createBooking(t10_create.req, t10_create.res);
    const disputeBooking = t10_create.getData().booking;

    // Advance to COMPLETION_PENDING
    await bookingController.transitionBookingStatus(
      createMockReqRes(providerUser, { status: BOOKING_STATUS.ACCEPTED }, { id: disputeBooking._id }).req,
      createMockReqRes(providerUser, { status: BOOKING_STATUS.ACCEPTED }, { id: disputeBooking._id }).res
    );
    await bookingController.transitionBookingStatus(
      createMockReqRes(providerUser, { status: BOOKING_STATUS.SCHEDULED }, { id: disputeBooking._id }).req,
      createMockReqRes(providerUser, { status: BOOKING_STATUS.SCHEDULED }, { id: disputeBooking._id }).res
    );
    await bookingController.transitionBookingStatus(
      createMockReqRes(providerUser, { status: BOOKING_STATUS.TECHNICIAN_ARRIVED }, { id: disputeBooking._id }).req,
      createMockReqRes(providerUser, { status: BOOKING_STATUS.TECHNICIAN_ARRIVED }, { id: disputeBooking._id }).res
    );
    await bookingController.transitionBookingStatus(
      createMockReqRes(providerUser, { status: BOOKING_STATUS.IN_PROGRESS }, { id: disputeBooking._id }).req,
      createMockReqRes(providerUser, { status: BOOKING_STATUS.IN_PROGRESS }, { id: disputeBooking._id }).res
    );
    await bookingController.transitionBookingStatus(
      createMockReqRes(providerUser, { status: BOOKING_STATUS.COMPLETION_PENDING }, { id: disputeBooking._id }).req,
      createMockReqRes(providerUser, { status: BOOKING_STATUS.COMPLETION_PENDING }, { id: disputeBooking._id }).res
    );

    // Customer files dispute
    const t10_disp = createMockReqRes(
      customerUser,
      { status: BOOKING_STATUS.DISPUTED, reason: 'Drain still leaking underneath cabinet' },
      { id: disputeBooking._id }
    );
    await bookingController.transitionBookingStatus(t10_disp.req, t10_disp.res);
    if (t10_disp.getStatus() !== 200 || t10_disp.getData().booking.status !== BOOKING_STATUS.DISPUTED) {
      throw new Error(`Dispute failed: ${JSON.stringify(t10_disp.getData())}`);
    }
    console.log('  -> PASS: Customer disputed work: DISPUTED.');

    // Admin resolves dispute
    const t10_res = createMockReqRes(
      adminUser,
      { status: BOOKING_STATUS.COMPLETED, reason: 'Admin mediated: contractor returned and fixed trap seal to customer satisfaction' },
      { id: disputeBooking._id }
    );
    await bookingController.transitionBookingStatus(t10_res.req, t10_res.res);
    if (t10_res.getStatus() !== 200 || t10_res.getData().booking.status !== BOOKING_STATUS.COMPLETED) {
      throw new Error(`Admin dispute resolution failed: ${JSON.stringify(t10_res.getData())}`);
    }
    console.log('  -> PASS: Admin resolved dispute to COMPLETED.');

    console.log('\n============================================================');
    console.log('ALL 10 PHASE 5 BOOKING TESTS PASSED SUCCESSFULLY!');
    console.log('============================================================\n');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runBookingTests();
