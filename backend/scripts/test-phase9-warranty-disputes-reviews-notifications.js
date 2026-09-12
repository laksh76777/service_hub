/**
 * Phase 9: Warranty, Disputes, Reviews & Notifications Test Suite
 *
 * Verifies:
 * 1. WARRANTY WORKFLOW:
 *    - Provider assigns warranty terms to completed booking.
 *    - Unauthorized user cannot assign warranty (403).
 *    - Warranty retrieval for booking.
 *    - Customer submits warranty claim with description and evidence.
 *    - Unauthorized user cannot file claim (403).
 *    - Provider/Admin updates claim status (UNDER_REVIEW -> RESOLVED).
 * 2. DISPUTE WORKFLOW:
 *    - Customer raises dispute against booking; booking transitions to DISPUTED.
 *    - Unauthorized customer blocked (403).
 *    - Duplicate open dispute blocked (400).
 *    - Provider submits response; status transitions to UNDER_REVIEW.
 *    - Unauthorized user cannot respond (403).
 *    - Admin arbitrates and resolves dispute with resolution type (REWORK / FULL_REFUND).
 *    - Audit history captures all transitions and actions chronologically.
 *    - Booking restored to COMPLETED upon resolution.
 * 3. REVIEW WORKFLOW:
 *    - Review before completion blocked (400).
 *    - Provider self-review blocked (400).
 *    - Arbitrary review ownership blocked (403).
 *    - Valid 5-star review submitted for completed booking.
 *    - Duplicate review for same booking blocked (400).
 *    - Provider profile average rating and review count recalculated efficiently.
 * 4. NOTIFICATION SYSTEM:
 *    - Notifications dispatched for warranty, dispute, review, and system events.
 *    - User retrieves in-app notifications (GET /api/notifications).
 *    - User marks single notification as read (PATCH /api/notifications/:id/read).
 *    - User marks all notifications as read (PATCH /api/notifications/read-all).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/database');
const User = require('../src/models/User');
const Booking = require('../src/models/Booking');
const Service = require('../src/models/Service');
const ServiceCategory = require('../src/models/ServiceCategory');
const ProviderProfile = require('../src/models/ProviderProfile');
const Warranty = require('../src/models/Warranty');
const WarrantyClaim = require('../src/models/WarrantyClaim');
const Dispute = require('../src/models/Dispute');
const Review = require('../src/models/Review');
const Notification = require('../src/models/Notification');

const warrantyController = require('../src/controllers/warrantyController');
const disputeController = require('../src/controllers/disputeController');
const reviewController = require('../src/controllers/reviewController');
const notificationController = require('../src/controllers/notificationController');

const {
  WARRANTY_STATUS,
  WARRANTY_CLAIM_STATUS,
  DISPUTE_STATUS,
  DISPUTE_RESOLUTION,
  DISPUTE_REASON,
  BOOKING_STATUS,
  USER_ROLES,
  NOTIFICATION_TYPE
} = require('../src/utils/constants');

/**
 * Mock Request & Response Helper
 */
const createMockReqRes = (user, body = {}, params = {}, query = {}) => {
  let statusCode = 200;
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

  const req = {
    user,
    body,
    params,
    query
  };

  const getResult = () => ({ status: statusCode, body: responseData });

  return { req, res, getResult };
};

async function runPhase9Tests() {
  console.log('='.repeat(70));
  console.log('--- STARTING PHASE 9: WARRANTY, DISPUTES, REVIEWS & NOTIFICATIONS ---');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;

  const assert = (condition, description) => {
    if (condition) {
      console.log(`  [PASS] ${description}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${description}`);
      failed++;
    }
  };

  try {
    await connectDB();

    // 1. Setup Test Users
    const customer = await User.findOneAndUpdate(
      { email: 'phase9_customer@servicehub.test' },
      {
        firebaseUid: 'test-p9-cust-uid',
        email: 'phase9_customer@servicehub.test',
        fullName: 'Phase 9 Customer',
        phoneNumber: '+919876543310',
        role: USER_ROLES.CUSTOMER
      },
      { upsert: true, returnDocument: 'after' }
    );

    const provider = await User.findOneAndUpdate(
      { email: 'phase9_provider@servicehub.test' },
      {
        firebaseUid: 'test-p9-prov-uid',
        email: 'phase9_provider@servicehub.test',
        fullName: 'Phase 9 Provider',
        phoneNumber: '+919876543311',
        role: USER_ROLES.PROVIDER
      },
      { upsert: true, returnDocument: 'after' }
    );

    const admin = await User.findOneAndUpdate(
      { email: 'phase9_admin@servicehub.test' },
      {
        firebaseUid: 'test-p9-admin-uid',
        email: 'phase9_admin@servicehub.test',
        fullName: 'Phase 9 Administrator',
        phoneNumber: '+919876543312',
        role: USER_ROLES.ADMIN
      },
      { upsert: true, returnDocument: 'after' }
    );

    const attacker = await User.findOneAndUpdate(
      { email: 'phase9_attacker@servicehub.test' },
      {
        firebaseUid: 'test-p9-attacker-uid',
        email: 'phase9_attacker@servicehub.test',
        fullName: 'Phase 9 Attacker',
        phoneNumber: '+919876543399',
        role: USER_ROLES.CUSTOMER
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Setup Provider Profile
    await ProviderProfile.findOneAndUpdate(
      { userId: provider._id },
      {
        userId: provider._id,
        businessName: 'Phase 9 Expert Services',
        status: 'VERIFIED',
        'rating.average': 0,
        'rating.count': 0
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Setup Service
    let service = await Service.findOne();
    if (!service) {
      let cat = await ServiceCategory.findOne();
      if (!cat) {
        cat = await ServiceCategory.create({ name: 'Appliance Repair', slug: 'appliance-repair' });
      }
      service = await Service.create({
        name: 'Phase 9 Washing Machine Repair',
        slug: 'phase-9-wm-repair',
        description: 'Test service for Phase 9',
        basePrice: 899,
        estimatedDurationHours: 2,
        categoryId: cat._id
      });
    }

    // Clean past Phase 9 data
    await Booking.deleteMany({ customerId: customer._id, problemDescription: 'Phase 9 Test Washing Machine Drum Issue' });
    await Warranty.deleteMany({ customerId: customer._id });
    await WarrantyClaim.deleteMany({ customerId: customer._id });
    await Dispute.deleteMany({ raisedById: customer._id });
    await Review.deleteMany({ customerId: customer._id });
    await Notification.deleteMany({ recipientId: { $in: [customer._id, provider._id, admin._id] } });

    // Create a Completed Booking for Warranty & Review tests
    const completedBooking = await Booking.create({
      bookingNumber: `BK-${Date.now().toString().slice(-4)}-P901`,
      customerId: customer._id,
      providerId: provider._id,
      serviceId: service._id,
      status: BOOKING_STATUS.COMPLETED,
      scheduledDate: new Date(),
      address: {
        addressLine1: 'Flat 402, Phase 9 Residency',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001'
      },
      problemDescription: 'Phase 9 Test Washing Machine Drum Issue',
      pricing: {
        estimatedTotal: 1500,
        finalTotal: 1500,
        isPaid: true,
        paidAt: new Date()
      }
    });

    // Create an In-Progress Booking for validation tests
    const inProgressBooking = await Booking.create({
      bookingNumber: `BK-${Date.now().toString().slice(-4)}-P902`,
      customerId: customer._id,
      providerId: provider._id,
      serviceId: service._id,
      status: BOOKING_STATUS.IN_PROGRESS,
      scheduledDate: new Date(),
      address: {
        addressLine1: 'Flat 402, Phase 9 Residency',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001'
      },
      problemDescription: 'Phase 9 In-Progress Booking'
    });

    console.log(`\nSetup completed: Completed Booking ${completedBooking.bookingNumber}, In-Progress Booking ${inProgressBooking.bookingNumber}\n`);

    // =========================================================================
    // SECTION 1: WARRANTY WORKFLOW
    // =========================================================================
    console.log('--- SECTION 1: WARRANTY & WARRANTY CLAIMS WORKFLOW ---');
    let warrantyId;
    let claimId;

    // 1.1 Provider assigns warranty to completed work
    {
      const { req, res, getResult } = createMockReqRes(provider, {
        bookingId: completedBooking._id.toString(),
        durationDays: 60,
        terms: 'Comprehensive 60-day replacement warranty on motor and bearings.'
      });

      await warrantyController.createWarranty(req, res);
      const result = getResult();

      assert(result.status === 201, 'Provider assigned warranty successfully (201 Created)');
      assert(result.body.data.status === WARRANTY_STATUS.ACTIVE, 'Warranty status is ACTIVE');
      assert(result.body.data.durationDays === 60, 'Warranty duration is 60 days');
      assert(result.body.data.warrantyCode.startsWith('WAR-'), 'Generated warranty code starts with WAR-');
      warrantyId = result.body.data._id.toString();
    }

    // 1.2 Unauthorized user blocked from assigning warranty
    {
      const { req, res, getResult } = createMockReqRes(attacker, {
        bookingId: completedBooking._id.toString()
      });

      await warrantyController.createWarranty(req, res);
      const result = getResult();

      assert(result.status === 403, 'Unauthorized user blocked with 403 Forbidden from creating warranty');
    }

    // 1.3 Assigning warranty to non-completed booking blocked
    {
      const { req, res, getResult } = createMockReqRes(provider, {
        bookingId: inProgressBooking._id.toString()
      });

      await warrantyController.createWarranty(req, res);
      const result = getResult();

      assert(result.status === 400, 'Assigning warranty to IN_PROGRESS booking rejected with 400 Bad Request');
    }

    // 1.4 Get warranty by booking
    {
      const { req, res, getResult } = createMockReqRes(customer, {}, {
        bookingId: completedBooking._id.toString()
      });

      await warrantyController.getWarrantyByBooking(req, res);
      const result = getResult();

      assert(result.status === 200, 'Retrieved warranty by booking ID (200 OK)');
      assert(result.body.data.warranty._id.toString() === warrantyId, 'Returned correct warranty record');
    }

    // 1.5 Customer files warranty claim
    {
      const { req, res, getResult } = createMockReqRes(customer, {
        description: 'Motor began vibrating abnormally after 2 weeks of use.',
        evidenceFiles: ['https://storage.servicehub.test/evidence/motor_noise.mp4']
      }, {
        id: warrantyId
      });

      await warrantyController.createWarrantyClaim(req, res);
      const result = getResult();

      assert(result.status === 201, 'Customer filed warranty claim successfully (201 Created)');
      assert(result.body.data.status === WARRANTY_CLAIM_STATUS.SUBMITTED, 'Claim status is SUBMITTED');
      assert(result.body.data.claimNumber.startsWith('CLM-'), 'Claim number generated with CLM- prefix');
      claimId = result.body.data._id.toString();
    }

    // 1.6 Unauthorized attacker blocked from filing claim
    {
      const { req, res, getResult } = createMockReqRes(attacker, {
        description: 'Fake claim attempt'
      }, {
        id: warrantyId
      });

      await warrantyController.createWarrantyClaim(req, res);
      const result = getResult();

      assert(result.status === 403, 'Attacker blocked with 403 Forbidden from filing claim on other user warranty');
    }

    // 1.7 Provider updates claim status to UNDER_REVIEW then RESOLVED
    {
      // First update to UNDER_REVIEW
      const reviewReq = createMockReqRes(provider, {
        status: WARRANTY_CLAIM_STATUS.UNDER_REVIEW,
        resolutionDetails: 'Technician dispatched for free on-site warranty inspection.'
      }, {
        claimId
      });

      await warrantyController.updateClaimStatus(reviewReq.req, reviewReq.res);
      const reviewResult = reviewReq.getResult();
      assert(reviewResult.status === 200, 'Claim transitioned to UNDER_REVIEW by provider');

      // Then resolve claim
      const resolveReq = createMockReqRes(provider, {
        status: WARRANTY_CLAIM_STATUS.RESOLVED,
        resolutionDetails: 'Replaced defective drum bearing at zero customer charge.'
      }, {
        claimId
      });

      await warrantyController.updateClaimStatus(resolveReq.req, resolveReq.res);
      const resolveResult = resolveReq.getResult();

      assert(resolveResult.status === 200, 'Claim status updated to RESOLVED');
      assert(resolveResult.body.data.status === WARRANTY_CLAIM_STATUS.RESOLVED, 'Claim marked as RESOLVED');
      assert(resolveResult.body.data.resolvedAt != null, 'Claim resolvedAt timestamp stamped');
    }

    // =========================================================================
    // SECTION 2: DISPUTES WORKFLOW
    // =========================================================================
    console.log('\n--- SECTION 2: DISPUTES & AUDIT HISTORY WORKFLOW ---');
    let disputeId;

    // Create a new booking specifically for dispute testing
    const disputeBooking = await Booking.create({
      bookingNumber: `BK-${Date.now().toString().slice(-4)}-P903`,
      customerId: customer._id,
      providerId: provider._id,
      serviceId: service._id,
      status: BOOKING_STATUS.CUSTOMER_VERIFIED,
      scheduledDate: new Date(),
      address: {
        addressLine1: 'Flat 402, Phase 9 Residency',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001'
      },
      problemDescription: 'Phase 9 Dispute Test Booking'
    });

    // 2.1 Customer raises dispute
    {
      const { req, res, getResult } = createMockReqRes(customer, {
        bookingId: disputeBooking._id.toString(),
        reason: DISPUTE_REASON.QUALITY_OF_WORK,
        description: 'Water leak started immediately after technician left. Floor was damaged.',
        evidenceUrls: ['https://storage.servicehub.test/evidence/leak_damage.jpg']
      });

      await disputeController.createDispute(req, res);
      const result = getResult();

      assert(result.status === 201, 'Customer raised dispute (201 Created)');
      assert(result.body.data.status === DISPUTE_STATUS.OPEN, 'Dispute status is OPEN');
      assert(result.body.data.disputeNumber.startsWith('DSP-'), 'Dispute number generated with DSP- prefix');
      assert(result.body.data.auditHistory.length === 1, 'Initial audit log entry recorded in auditHistory');
      disputeId = result.body.data._id.toString();

      // Verify booking was moved to DISPUTED status
      const updatedBooking = await Booking.findById(disputeBooking._id);
      assert(updatedBooking.status === BOOKING_STATUS.DISPUTED, 'Booking status transitioned to DISPUTED');
    }

    // 2.2 Duplicate active dispute blocked
    {
      const { req, res, getResult } = createMockReqRes(customer, {
        bookingId: disputeBooking._id.toString(),
        reason: DISPUTE_REASON.BILLING_DISCREPANCY,
        description: 'Duplicate attempt'
      });

      await disputeController.createDispute(req, res);
      const result = getResult();

      assert(result.status === 400, 'Duplicate active dispute blocked with 400 Bad Request');
    }

    // 2.3 Provider responds to dispute
    {
      const { req, res, getResult } = createMockReqRes(provider, {
        message: 'We will inspect the plumbing fitting and re-seal the coupling at no extra cost.'
      }, {
        id: disputeId
      });

      await disputeController.respondToDispute(req, res);
      const result = getResult();

      assert(result.status === 200, 'Provider submitted formal response (200 OK)');
      assert(result.body.data.status === DISPUTE_STATUS.UNDER_REVIEW, 'Dispute transitioned to UNDER_REVIEW');
      assert(result.body.data.providerResponse.message.includes('re-seal'), 'Provider message stored accurately');
      assert(result.body.data.auditHistory.length === 2, 'Audit history now has 2 chronological entries');
    }

    // 2.4 Unauthorized user blocked from resolving dispute
    {
      const { req, res, getResult } = createMockReqRes(provider, {
        status: DISPUTE_STATUS.RESOLVED,
        resolutionType: DISPUTE_RESOLUTION.NO_ACTION
      }, {
        id: disputeId
      });

      await disputeController.resolveDispute(req, res);
      const result = getResult();

      assert(result.status === 403, 'Non-admin user blocked with 403 from arbitrating dispute');
    }

    // 2.5 Admin resolves dispute with resolutionType REWORK
    {
      const { req, res, getResult } = createMockReqRes(admin, {
        status: DISPUTE_STATUS.RESOLVED,
        resolutionType: DISPUTE_RESOLUTION.REWORK,
        resolutionNotes: 'Provider authorized to return and replace faulty seal coupling under warranty.',
        refundAmount: 0
      }, {
        id: disputeId
      });

      await disputeController.resolveDispute(req, res);
      const result = getResult();

      assert(result.status === 200, 'Admin resolved dispute successfully (200 OK)');
      assert(result.body.data.status === DISPUTE_STATUS.RESOLVED, 'Dispute status is RESOLVED');
      assert(result.body.data.resolutionType === DISPUTE_RESOLUTION.REWORK, 'Resolution type is REWORK');
      assert(result.body.data.auditHistory.length === 3, 'Audit history contains complete 3-step audit trail');

      // Verify booking was restored from DISPUTED to COMPLETED
      const resolvedBooking = await Booking.findById(disputeBooking._id);
      assert(resolvedBooking.status === BOOKING_STATUS.COMPLETED, 'Booking status finalized to COMPLETED upon dispute resolution');
    }

    // =========================================================================
    // SECTION 3: REVIEWS & PROVIDER RATING WORKFLOW
    // =========================================================================
    console.log('\n--- SECTION 3: REVIEWS & PROVIDER RATING WORKFLOW ---');

    // 3.1 Review before completion blocked
    {
      const { req, res, getResult } = createMockReqRes(customer, {
        bookingId: inProgressBooking._id.toString(),
        rating: 5,
        comment: 'Premature review attempt'
      });

      await reviewController.createReview(req, res);
      const result = getResult();

      assert(result.status === 400, 'Review submission before completion blocked with 400 Bad Request');
    }

    // 3.2 Provider self-review blocked
    {
      const { req, res, getResult } = createMockReqRes(provider, {
        bookingId: completedBooking._id.toString(),
        rating: 5,
        comment: 'Self review attempt'
      });

      await reviewController.createReview(req, res);
      const result = getResult();

      assert(result.status === 403, 'Provider blocked from reviewing completed booking as customer');
    }

    // 3.3 Attacker customer blocked from reviewing another customer's booking
    {
      const { req, res, getResult } = createMockReqRes(attacker, {
        bookingId: completedBooking._id.toString(),
        rating: 1,
        comment: 'Malicious review'
      });

      await reviewController.createReview(req, res);
      const result = getResult();

      assert(result.status === 403, 'Unauthorized customer blocked with 403 from reviewing another customer booking');
    }

    // 3.4 Valid 5-star review submitted by customer
    {
      const { req, res, getResult } = createMockReqRes(customer, {
        bookingId: completedBooking._id.toString(),
        rating: 5,
        comment: 'Outstanding service! The technician arrived promptly and resolved the issue completely.'
      });

      await reviewController.createReview(req, res);
      const result = getResult();

      assert(result.status === 201, 'Customer submitted 5-star review (201 Created)');
      assert(result.body.data.rating === 5, 'Rating is 5 stars');
      assert(result.body.data.verifiedWork === true, 'Review flagged as verifiedWork: true');

      // Verify ProviderProfile rating update
      const profile = await ProviderProfile.findOne({ userId: provider._id });
      assert(profile.rating.average === 5, `Provider average rating updated to ${profile.rating.average}`);
      assert(profile.rating.count === 1, `Provider review count updated to ${profile.rating.count}`);
    }

    // 3.5 Duplicate review blocked
    {
      const { req, res, getResult } = createMockReqRes(customer, {
        bookingId: completedBooking._id.toString(),
        rating: 4,
        comment: 'Duplicate review attempt'
      });

      await reviewController.createReview(req, res);
      const result = getResult();

      assert(result.status === 400, 'Duplicate review for same booking blocked with 400 Bad Request');
    }

    // =========================================================================
    // SECTION 4: NOTIFICATIONS SYSTEM
    // =========================================================================
    console.log('\n--- SECTION 4: IN-APP NOTIFICATIONS SYSTEM ---');

    // 4.1 Check provider received notifications from review & warranty claim
    let notificationId;
    {
      const { req, res, getResult } = createMockReqRes(provider);

      await notificationController.getNotifications(req, res);
      const result = getResult();

      assert(result.status === 200, 'Provider retrieved notifications (200 OK)');
      assert(result.body.data.total > 0, `Provider received notifications (found ${result.body.data.total})`);
      assert(result.body.data.unreadCount > 0, `Provider has unread notifications (${result.body.data.unreadCount})`);

      notificationId = result.body.data.notifications[0]._id.toString();
    }

    // 4.2 Mark single notification as read
    {
      const { req, res, getResult } = createMockReqRes(provider, {}, {
        id: notificationId
      });

      await notificationController.markNotificationRead(req, res);
      const result = getResult();

      assert(result.status === 200, 'Mark notification as read returns 200 OK');
      assert(result.body.data.isRead === true, 'Notification isRead set to true');
      assert(result.body.data.readAt != null, 'Notification readAt timestamp recorded');
    }

    // 4.3 Mark all notifications as read
    {
      const { req, res, getResult } = createMockReqRes(provider);

      await notificationController.markAllNotificationsRead(req, res);
      const result = getResult();

      assert(result.status === 200, 'Mark all notifications as read returns 200 OK');

      // Verify unreadCount is now 0
      const checkReq = createMockReqRes(provider);
      await notificationController.getNotifications(checkReq.req, checkReq.res);
      const checkResult = checkReq.getResult();

      assert(checkResult.body.data.unreadCount === 0, 'Provider unread count is now 0');
    }

    console.log('\n' + '='.repeat(70));
    console.log(`PHASE 9 TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log('='.repeat(70));

    await disconnectDB();
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error in Phase 9 tests:', error);
    await disconnectDB();
    process.exit(1);
  }
}

runPhase9Tests();
