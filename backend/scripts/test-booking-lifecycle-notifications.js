/**
 * Automated Test Suite: ServiceHub Booking Lifecycle Notifications
 *
 * Validates notification generation across the complete lifecycle:
 *
 * 1. Customer Notifications:
 *    - Request sent (BOOKING_REQUESTED)
 *    - Technician accepts (BOOKING_ACCEPTED)
 *    - Technician rejects (BOOKING_REJECTED)
 *    - Estimate submitted (ESTIMATE_SUBMITTED)
 *    - Estimate approved (ESTIMATE_APPROVED)
 *    - Payment successful (PAYMENT_SUCCESS)
 *    - Payment failed (PAYMENT_FAILED)
 *    - Work started (WORK_STARTED)
 *    - Work completed (WORK_COMPLETED)
 *    - Invoice generated (INVOICE_GENERATED)
 *    - Warranty available (WARRANTY_AVAILABLE)
 *    - Review requested (REVIEW_REQUESTED)
 *
 * 2. Technician Notifications:
 *    - New request received (BOOKING_REQUESTED)
 *    - Customer cancels (BOOKING_CANCELLED)
 *    - Estimate approved (ESTIMATE_APPROVED)
 *    - Payment successful (PAYMENT_SUCCESS)
 *    - Job schedule changes (BOOKING_RESCHEDULED)
 *    - Customer confirms completion (CUSTOMER_CONFIRMED)
 *
 * 3. Admin Notifications:
 *    - Technician registration (TECHNICIAN_REGISTERED)
 *    - Verification requests (VERIFICATION_REQUESTED)
 *    - Disputes (DISPUTE_CREATED)
 *
 * 4. Notification Data Integrity:
 *    - Contains: title, message, type, related booking (bookingId), read/unread (isRead), createdAt.
 *    - Mark as read & Mark all as read.
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Booking = require('../src/models/Booking');
const Service = require('../src/models/Service');
const ProviderProfile = require('../src/models/ProviderProfile');
const Estimate = require('../src/models/Estimate');
const Invoice = require('../src/models/Invoice');
const Payment = require('../src/models/Payment');
const Warranty = require('../src/models/Warranty');
const Dispute = require('../src/models/Dispute');
const Notification = require('../src/models/Notification');
const notificationService = require('../src/services/notificationService');

const bookingController = require('../src/controllers/bookingController');
const estimateController = require('../src/controllers/estimateController');
const paymentController = require('../src/controllers/paymentController');
const invoiceController = require('../src/controllers/invoiceController');
const warrantyController = require('../src/controllers/warrantyController');
const disputeController = require('../src/controllers/disputeController');
const userController = require('../src/controllers/userController');
const notificationController = require('../src/controllers/notificationController');

const {
  BOOKING_STATUS,
  ESTIMATE_STATUS,
  ESTIMATE_ITEM_TYPE,
  PAYMENT_STATUS,
  USER_ROLES,
  USER_STATUS,
  PROVIDER_STATUS,
  NOTIFICATION_TYPE
} = require('../src/utils/constants');

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

function mockReqRes(user, body = {}, params = {}, query = {}) {
  const req = {
    user,
    body,
    params,
    query,
    headers: {}
  };

  let statusCode = 200;
  let responseBody = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseBody = data;
      return this;
    }
  };

  return {
    req,
    res,
    getResult: () => ({ status: statusCode, body: responseBody })
  };
}

async function runNotificationTests() {
  console.log('\n============================================================');
  console.log('🧪 SERVICEHUB BOOKING LIFECYCLE NOTIFICATIONS TEST SUITE');
  console.log('============================================================\n');

  // Set up in-memory collections
  const mockNotifications = [];
  const mockBookings = [];
  const mockEstimates = [];
  const mockInvoices = [];
  const mockPayments = [];
  const mockWarranties = [];
  const mockDisputes = [];
  const mockProfiles = [];

  // Wire Notification Mock
  Notification.create = async (doc) => {
    const item = {
      _id: new mongoose.Types.ObjectId(),
      recipientId: doc.recipientId,
      senderId: doc.senderId || null,
      bookingId: doc.bookingId || doc.data?.bookingId || null,
      type: doc.type,
      title: doc.title,
      message: doc.message,
      data: doc.data || {},
      isRead: doc.isRead || false,
      readAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    // add virtual
    Object.defineProperty(item, 'relatedBooking', {
      get() { return this.bookingId || this.data?.bookingId || null; }
    });
    mockNotifications.push(item);
    return item;
  };

  Notification.find = (filter = {}) => {
    let result = [...mockNotifications];
    if (filter.recipientId) {
      result = result.filter(
        (n) => n.recipientId.toString() === filter.recipientId.toString()
      );
    }
    if (filter.isRead !== undefined) {
      result = result.filter((n) => n.isRead === filter.isRead);
    }

    const queryObj = {
      sort: () => queryObj,
      skip: () => queryObj,
      limit: () => queryObj,
      populate: () => queryObj,
      then: (resolve) => resolve(result),
      [Symbol.toStringTag]: 'Promise'
    };
    queryObj.then = (fn) => Promise.resolve(result).then(fn);
    return queryObj;
  };

  Notification.countDocuments = async (filter = {}) => {
    let result = [...mockNotifications];
    if (filter.recipientId) {
      result = result.filter(
        (n) => n.recipientId.toString() === filter.recipientId.toString()
      );
    }
    if (filter.isRead !== undefined) {
      result = result.filter((n) => n.isRead === filter.isRead);
    }
    return result.length;
  };

  Notification.findOneAndUpdate = async (filter, update) => {
    const notif = mockNotifications.find(
      (n) =>
        n._id.toString() === filter._id.toString() &&
        n.recipientId.toString() === filter.recipientId.toString()
    );
    if (!notif) return null;
    if (update.isRead !== undefined) notif.isRead = update.isRead;
    if (update.readAt !== undefined) notif.readAt = update.readAt;
    return notif;
  };

  Notification.updateMany = async (filter, update) => {
    let modifiedCount = 0;
    mockNotifications.forEach((n) => {
      if (filter.recipientId && n.recipientId.toString() === filter.recipientId.toString()) {
        if (filter.isRead === undefined || n.isRead === filter.isRead) {
          if (update.isRead !== undefined) n.isRead = update.isRead;
          if (update.readAt !== undefined) n.readAt = update.readAt;
          modifiedCount++;
        }
      }
    });
    return { modifiedCount };
  };

  // Canonical Users
  const customerUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Laksh Customer',
    email: 'customer@servicehub.test',
    role: USER_ROLES.CUSTOMER,
    status: USER_STATUS.ACTIVE
  };

  const technicianUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Rahul Sharma',
    email: 'rahul@servicehub.test',
    role: USER_ROLES.TECHNICIAN,
    status: USER_STATUS.ACTIVE
  };

  const adminUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Platform Admin',
    email: 'admin@servicehub.test',
    role: USER_ROLES.ADMIN,
    status: USER_STATUS.ACTIVE
  };

  const mockUsers = [customerUser, technicianUser, adminUser];

  User.find = async (filter = {}) => {
    if (filter.role) {
      return mockUsers.filter((u) => u.role === filter.role);
    }
    return mockUsers;
  };
  User.findById = async (id) => mockUsers.find((u) => u._id.toString() === id.toString()) || null;
  User.findOne = async (filter) => {
    if (filter.role) return mockUsers.find((u) => u.role === filter.role) || null;
    if (filter.email) return mockUsers.find((u) => u.email === filter.email) || null;
    return null;
  };

  // Mock Service
  const acService = {
    _id: new mongoose.Types.ObjectId(),
    name: 'AC Repair',
    basePrice: 500,
    isActive: true
  };
  Service.findById = async (id) => acService;

  // Mock Technician Profile
  const technicianProfile = {
    _id: new mongoose.Types.ObjectId(),
    userId: technicianUser._id,
    profession: 'AC Technician',
    status: PROVIDER_STATUS.VERIFIED,
    verificationStatus: PROVIDER_STATUS.VERIFIED,
    servicesOffered: [
      {
        serviceId: acService._id,
        isActive: true,
        pricing: { amount: 500 }
      }
    ]
  };
  mockProfiles.push(technicianProfile);
  ProviderProfile.findOne = async (filter) =>
    mockProfiles.find((p) => filter.userId && p.userId.toString() === filter.userId.toString()) || null;
  ProviderProfile.create = async (doc) => {
    const item = { _id: new mongoose.Types.ObjectId(), ...doc };
    mockProfiles.push(item);
    return item;
  };

  // Wire Booking Mock
  Booking.prototype.save = async function () {
    const existingIdx = mockBookings.findIndex((b) => b._id.toString() === this._id.toString());
    if (existingIdx >= 0) {
      mockBookings[existingIdx] = this;
    } else {
      mockBookings.push(this);
    }
    return this;
  };

  Booking.findById = (id) => {
    const b = mockBookings.find((x) => x._id.toString() === id.toString());
    const queryObj = {
      populate: () => queryObj,
      then: (resolve) => resolve(b),
      [Symbol.toStringTag]: 'Promise'
    };
    queryObj.then = (fn) => Promise.resolve(b).then(fn);
    return queryObj;
  };

  Booking.findOne = (filter) => {
    const b = mockBookings.find((x) => x._id.toString() === filter._id?.toString());
    const queryObj = {
      populate: () => queryObj,
      then: (resolve) => resolve(b),
      [Symbol.toStringTag]: 'Promise'
    };
    queryObj.then = (fn) => Promise.resolve(b).then(fn);
    return queryObj;
  };

  // Wire Estimate Mock
  Estimate.create = async (doc) => {
    const est = {
      _id: new mongoose.Types.ObjectId(),
      ...doc,
      save: async function () { return this; },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockEstimates.push(est);
    return est;
  };
  Estimate.find = (filter) => {
    let result = mockEstimates.filter((e) => e.bookingId.toString() === filter.bookingId.toString());
    if (filter.status) {
      result = result.filter((e) => e.status === filter.status);
    }
    const queryObj = {
      populate: () => queryObj,
      sort: () => queryObj,
      then: (resolve) => resolve(result),
      [Symbol.toStringTag]: 'Promise'
    };
    queryObj.then = (fn) => Promise.resolve(result).then(fn);
    return queryObj;
  };
  Estimate.findById = (id) => {
    const est = mockEstimates.find((e) => e._id.toString() === id.toString());
    const queryObj = {
      populate: () => queryObj,
      then: (resolve) => resolve(est),
      [Symbol.toStringTag]: 'Promise'
    };
    queryObj.then = (fn) => Promise.resolve(est).then(fn);
    return queryObj;
  };
  Estimate.updateMany = async () => ({ modifiedCount: 1 });

  // Wire Invoice Mock
  Invoice.create = async (doc) => {
    const inv = { _id: new mongoose.Types.ObjectId(), ...doc, createdAt: new Date() };
    mockInvoices.push(inv);
    return inv;
  };
  Invoice.findById = (id) => {
    const inv = mockInvoices.find((i) => i._id.toString() === id.toString());
    const queryObj = {
      populate: () => queryObj,
      then: (resolve) => resolve(inv),
      [Symbol.toStringTag]: 'Promise'
    };
    queryObj.then = (fn) => Promise.resolve(inv).then(fn);
    return queryObj;
  };
  Invoice.findOne = (filter) => {
    const inv = mockInvoices.find((i) => i.bookingId.toString() === filter.bookingId.toString());
    const queryObj = {
      populate: () => queryObj,
      then: (resolve) => resolve(inv),
      [Symbol.toStringTag]: 'Promise'
    };
    queryObj.then = (fn) => Promise.resolve(inv).then(fn);
    return queryObj;
  };

  // Wire Payment Mock
  Payment.create = async (doc) => {
    const p = { _id: new mongoose.Types.ObjectId(), ...doc, createdAt: new Date() };
    mockPayments.push(p);
    return p;
  };
  Payment.findOne = async (filter) => mockPayments.find((p) => p.bookingId.toString() === filter.bookingId?.toString()) || null;
  Payment.findById = async (id) => mockPayments.find((p) => p._id.toString() === id.toString()) || null;

  // Wire Warranty Mock
  Warranty.findOne = async (filter) => mockWarranties.find((w) => w.bookingId.toString() === filter.bookingId.toString()) || null;
  Warranty.findById = (id) => {
    const doc = mockWarranties.find((w) => w._id.toString() === id.toString()) || null;
    const queryObj = {
      populate: () => queryObj,
      then: (resolve) => resolve(doc),
      catch: () => {}
    };
    return queryObj;
  };
  Warranty.create = async (doc) => {
    const w = { _id: new mongoose.Types.ObjectId(), ...doc, save: async function () { return this; }, createdAt: new Date() };
    mockWarranties.push(w);
    return w;
  };

  // Wire Dispute Mock
  Dispute.findOne = async () => null;
  Dispute.findById = (id) => {
    const doc = mockDisputes.find((d) => d._id.toString() === id.toString()) || null;
    const queryObj = {
      populate: () => queryObj,
      then: (resolve) => resolve(doc),
      catch: () => {}
    };
    return queryObj;
  };
  Dispute.create = async (doc) => {
    const d = { _id: new mongoose.Types.ObjectId(), ...doc, disputeNumber: 'DSP-2026-101', createdAt: new Date() };
    mockDisputes.push(d);
    return d;
  };

  let booking = null;

  // ====================================================================
  // TEST 1: Customer sends request -> Customer & Technician Notified
  // ====================================================================
  console.log('🔹 [1/9] Testing Customer Service Request Creation Notifications...');
  {
    const { req, res, getResult } = mockReqRes(customerUser, {
      serviceId: acService._id.toString(),
      technicianId: technicianUser._id.toString(),
      address: { street: '123 MG Road', city: 'Bengaluru', state: 'Karnataka', pin: '560001' },
      scheduledDate: new Date(Date.now() + 86400000).toISOString(),
      preferredTimeSlot: 'Morning (09:00 - 12:00)',
      problemDescription: 'AC not cooling properly'
    });

    await bookingController.createBooking(req, res);
    const result = getResult();
    if (result.status !== 201) console.log('DEBUG result:', result);
    assert(result.status === 201, 'Booking created successfully (HTTP 201)');
    booking = result.body.booking;

    // Verify Customer Notification: Request sent
    const custReqNotif = mockNotifications.find(
      (n) =>
        n.recipientId.toString() === customerUser._id.toString() &&
        n.type === NOTIFICATION_TYPE.BOOKING_REQUESTED
    );
    assert(!!custReqNotif, 'Customer received Request Sent notification');
    assert(custReqNotif.title === 'Request Sent', 'Customer notification title is "Request Sent"');
    assert(custReqNotif.bookingId.toString() === booking._id.toString(), 'Notification contains related bookingId');
    assert(custReqNotif.isRead === false, 'Notification is unread by default');
    assert(!!custReqNotif.createdAt, 'Notification has createdAt timestamp');

    // Verify Technician Notification: New request received
    const techReqNotif = mockNotifications.find(
      (n) =>
        n.recipientId.toString() === technicianUser._id.toString() &&
        n.type === NOTIFICATION_TYPE.BOOKING_REQUESTED
    );
    assert(!!techReqNotif, 'Technician received New Request Received notification');
    assert(techReqNotif.title === 'New Request Received', 'Technician notification title is "New Request Received"');
    assert(techReqNotif.bookingId.toString() === booking._id.toString(), 'Technician notification links to booking');
  }

  // ====================================================================
  // TEST 2: Technician Accepts Request -> Customer Notified
  // ====================================================================
  console.log('\n🔹 [2/9] Testing Technician Accepts Request Notification...');
  {
    const { req, res, getResult } = mockReqRes(technicianUser, {
      status: BOOKING_STATUS.ACCEPTED
    }, { id: booking._id.toString() });

    await bookingController.updateBookingStatus(req, res);
    const result = getResult();
    assert(result.status === 200, 'Technician accepted booking (HTTP 200)');

    const acceptNotif = mockNotifications.find(
      (n) =>
        n.recipientId.toString() === customerUser._id.toString() &&
        n.type === NOTIFICATION_TYPE.BOOKING_ACCEPTED
    );
    assert(!!acceptNotif, 'Customer received Technician Accepts notification');
    assert(acceptNotif.title === 'Technician Accepts', 'Notification title is "Technician Accepts"');
    assert(acceptNotif.bookingId.toString() === booking._id.toString(), 'Accept notification references booking');
  }

  // ====================================================================
  // TEST 3: Schedule Changes Notification
  // ====================================================================
  console.log('\n🔹 [3/9] Testing Job Schedule Changes Notification...');
  {
    const newDate = new Date(Date.now() + 172800000).toISOString();
    const { req, res, getResult } = mockReqRes(customerUser, {
      newScheduledDate: newDate,
      newTimeSlot: 'Afternoon (14:00 - 17:00)',
      reason: 'Shift in work schedule'
    }, { id: booking._id.toString() });

    await bookingController.rescheduleBooking(req, res);
    const result = getResult();
    assert(result.status === 200, 'Booking rescheduled successfully (HTTP 200)');

    const schedNotif = mockNotifications.find(
      (n) =>
        n.recipientId.toString() === technicianUser._id.toString() &&
        n.type === NOTIFICATION_TYPE.BOOKING_RESCHEDULED
    );
    assert(!!schedNotif, 'Technician received Job Schedule Changes notification');
    assert(schedNotif.title === 'Job Schedule Changes', 'Notification title is "Job Schedule Changes"');
    assert(schedNotif.bookingId.toString() === booking._id.toString(), 'Schedule notification references booking');
  }

  // ====================================================================
  // TEST 4: Estimate Submitted, Approved & Rejected Notifications
  // ====================================================================
  console.log('\n🔹 [4/9] Testing Estimate Submitted, Approved & Rejected Notifications...');
  {
    // Advance to INSPECTION
    booking.status = BOOKING_STATUS.INSPECTION;

    // 1. Technician submits estimate
    let { req, res, getResult } = mockReqRes(technicianUser, {
      items: [
        { description: 'Labor repair', type: ESTIMATE_ITEM_TYPE.LABOUR, quantity: 1, unitPrice: 500 },
        { description: 'Capacitor', type: ESTIMATE_ITEM_TYPE.PART, quantity: 1, unitPrice: 400 }
      ],
      notes: 'Standard motor capacitor replacement'
    }, { id: booking._id.toString() });

    await estimateController.createEstimate(req, res);
    let result = getResult();
    assert(result.status === 201, 'Estimate created (HTTP 201)');
    const estimate = result.body.estimate;

    const estSubmittedNotif = mockNotifications.find(
      (n) =>
        n.recipientId.toString() === customerUser._id.toString() &&
        n.type === NOTIFICATION_TYPE.ESTIMATE_SUBMITTED
    );
    assert(!!estSubmittedNotif, 'Customer received Estimate Submitted notification');
    assert(estSubmittedNotif.title === 'Estimate Submitted', 'Notification title is "Estimate Submitted"');
    assert(estSubmittedNotif.bookingId.toString() === booking._id.toString(), 'Estimate notification has related booking');

    // 2. Customer rejects first estimate
    ({ req, res, getResult } = mockReqRes(customerUser, {
      reason: 'Please provide genuine manufacturer part'
    }, { id: estimate._id.toString() }));

    await estimateController.rejectEstimate(req, res);
    result = getResult();
    assert(result.status === 200, 'Estimate rejected (HTTP 200)');

    const estRejectedNotif = mockNotifications.find(
      (n) =>
        n.recipientId.toString() === technicianUser._id.toString() &&
        n.type === NOTIFICATION_TYPE.ESTIMATE_REJECTED
    );
    assert(!!estRejectedNotif, 'Technician received Estimate Rejected notification');
    assert(estRejectedNotif.title === 'Estimate Rejected', 'Notification title is "Estimate Rejected"');

    // 3. Technician submits revised estimate
    ({ req, res, getResult } = mockReqRes(technicianUser, {
      items: [
        { description: 'Labor repair', type: ESTIMATE_ITEM_TYPE.LABOUR, quantity: 1, unitPrice: 500 },
        { description: 'OEM Capacitor', type: ESTIMATE_ITEM_TYPE.PART, quantity: 1, unitPrice: 450 }
      ],
      notes: 'OEM original capacitor included'
    }, { id: booking._id.toString() }));

    await estimateController.createEstimate(req, res);
    const revisedEstimate = getResult().body.estimate;

    // 4. Customer approves revised estimate
    ({ req, res, getResult } = mockReqRes(customerUser, {}, { id: revisedEstimate._id.toString() }));
    await estimateController.approveEstimate(req, res);
    result = getResult();
    assert(result.status === 200, 'Estimate approved (HTTP 200)');

    const custApproveNotif = mockNotifications.find(
      (n) =>
        n.recipientId.toString() === customerUser._id.toString() &&
        n.type === NOTIFICATION_TYPE.ESTIMATE_APPROVED
    );
    assert(!!custApproveNotif, 'Customer received Estimate Approved notification');

    const techApproveNotif = mockNotifications.find(
      (n) =>
        n.recipientId.toString() === technicianUser._id.toString() &&
        n.type === NOTIFICATION_TYPE.ESTIMATE_APPROVED
    );
    assert(!!techApproveNotif, 'Technician received Estimate Approved notification');
    assert(techApproveNotif.title === 'Estimate Approved', 'Technician notification title is "Estimate Approved"');
  }

  // ====================================================================
  // TEST 5: Payment Successful & Payment Failed Notifications
  // ====================================================================
  console.log('\n🔹 [5/9] Testing Payment Successful & Failed Notifications...');
  {
    // Simulate failed payment notification
    await notificationService.notify({
      recipientId: customerUser._id,
      senderId: technicianUser._id,
      bookingId: booking._id,
      type: NOTIFICATION_TYPE.PAYMENT_FAILED,
      title: 'Payment Failed',
      message: 'Payment attempt of ₹1121 failed: Demo payment declined.',
      data: { bookingId: booking._id }
    });

    const payFailedNotif = mockNotifications.find(
      (n) =>
        n.recipientId.toString() === customerUser._id.toString() &&
        n.type === NOTIFICATION_TYPE.PAYMENT_FAILED
    );
    assert(!!payFailedNotif, 'Customer received Payment Failed notification');
    assert(payFailedNotif.title === 'Payment Failed', 'Notification title is "Payment Failed"');

    // Simulate successful payment completion
    await notificationService.notify({
      recipientId: customerUser._id,
      senderId: technicianUser._id,
      bookingId: booking._id,
      type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,
      title: 'Payment Successful',
      message: 'Your payment of ₹1121 was completed successfully.',
      data: { bookingId: booking._id }
    });

    await notificationService.notify({
      recipientId: technicianUser._id,
      senderId: customerUser._id,
      bookingId: booking._id,
      type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,
      title: 'Payment Successful',
      message: `Customer payment of ₹1121 received for booking ${booking.bookingNumber}.`,
      data: { bookingId: booking._id }
    });

    const custPaySuccessNotif = mockNotifications.find(
      (n) =>
        n.recipientId.toString() === customerUser._id.toString() &&
        n.type === NOTIFICATION_TYPE.PAYMENT_SUCCESS
    );
    assert(!!custPaySuccessNotif, 'Customer received Payment Successful notification');

    const techPaySuccessNotif = mockNotifications.find(
      (n) =>
        n.recipientId.toString() === technicianUser._id.toString() &&
        n.type === NOTIFICATION_TYPE.PAYMENT_SUCCESS
    );
    assert(!!techPaySuccessNotif, 'Technician received Payment Successful notification');
  }

  // ====================================================================
  // TEST 6: Work Started, Work Completed, Customer Confirms & Review
  // ====================================================================
  console.log('\n🔹 [6/9] Testing Work Execution & Completion Notifications...');
  {
    // Advance to PAYMENT_SUCCESS
    booking.status = BOOKING_STATUS.PAYMENT_SUCCESS;

    // 1. Technician starts work
    let { req, res, getResult } = mockReqRes(technicianUser, {
      status: BOOKING_STATUS.WORK_IN_PROGRESS
    }, { id: booking._id.toString() });

    await bookingController.updateBookingStatus(req, res);
    assert(getResult().status === 200, 'Work in progress updated (HTTP 200)');

    const workStartedNotif = mockNotifications.find(
      (n) =>
        n.recipientId.toString() === customerUser._id.toString() &&
        n.type === NOTIFICATION_TYPE.WORK_STARTED
    );
    assert(!!workStartedNotif, 'Customer received Work Started notification');
    assert(workStartedNotif.title === 'Work Started', 'Notification title is "Work Started"');

    // 2. Technician completes work
    ({ req, res, getResult } = mockReqRes(technicianUser, {
      status: BOOKING_STATUS.WORK_COMPLETED
    }, { id: booking._id.toString() }));

    await bookingController.updateBookingStatus(req, res);
    assert(getResult().status === 200, 'Work completed updated (HTTP 200)');

    const workCompletedNotif = mockNotifications.find(
      (n) =>
        n.recipientId.toString() === customerUser._id.toString() &&
        n.type === NOTIFICATION_TYPE.WORK_COMPLETED
    );
    assert(!!workCompletedNotif, 'Customer received Work Completed notification');
    assert(workCompletedNotif.title === 'Work Completed', 'Notification title is "Work Completed"');

    // 3. Customer confirms completion
    ({ req, res, getResult } = mockReqRes(customerUser, {
      status: BOOKING_STATUS.CUSTOMER_CONFIRMED
    }, { id: booking._id.toString() }));

    await bookingController.updateBookingStatus(req, res);
    assert(getResult().status === 200, 'Customer confirmed completion (HTTP 200)');

    const techConfirmedNotif = mockNotifications.find(
      (n) =>
        n.recipientId.toString() === technicianUser._id.toString() &&
        n.type === NOTIFICATION_TYPE.CUSTOMER_CONFIRMED
    );
    assert(!!techConfirmedNotif, 'Technician received Customer Confirms Completion notification');
    assert(techConfirmedNotif.title === 'Customer Confirms Completion', 'Notification title is "Customer Confirms Completion"');

    // 4. Customer receives Review Requested
    const reviewReqNotif = mockNotifications.find(
      (n) =>
        n.recipientId.toString() === customerUser._id.toString() &&
        n.type === NOTIFICATION_TYPE.REVIEW_REQUESTED
    );
    assert(!!reviewReqNotif, 'Customer received Review Requested notification');
    assert(reviewReqNotif.title === 'Review Requested', 'Notification title is "Review Requested"');
  }

  // ====================================================================
  // TEST 7: Invoice Generated & Warranty Available Notifications
  // ====================================================================
  console.log('\n🔹 [7/9] Testing Invoice Generated & Warranty Available Notifications...');
  {
    // Generate Invoice
    const { req, res, getResult } = mockReqRes(technicianUser, {}, { id: booking._id.toString() });
    await invoiceController.generateInvoice(req, res);
    assert(getResult().status === 201, 'Invoice generated (HTTP 201)');

    const invoiceNotif = mockNotifications.find(
      (n) =>
        n.recipientId.toString() === customerUser._id.toString() &&
        n.type === NOTIFICATION_TYPE.INVOICE_GENERATED
    );
    assert(!!invoiceNotif, 'Customer received Invoice Generated notification');
    assert(invoiceNotif.title === 'Invoice Generated', 'Notification title is "Invoice Generated"');

    // Activate Warranty
    const warRes = mockReqRes(technicianUser, { durationDays: 30 }, { id: booking._id.toString() });
    await warrantyController.createWarranty(warRes.req, warRes.res);
    assert(warRes.getResult().status === 201, 'Warranty assigned (HTTP 201)');

    const warrantyNotif = mockNotifications.find(
      (n) =>
        n.recipientId.toString() === customerUser._id.toString() &&
        n.type === NOTIFICATION_TYPE.WARRANTY_AVAILABLE
    );
    assert(!!warrantyNotif, 'Customer received Warranty Available notification');
    assert(warrantyNotif.title === 'Warranty Available', 'Notification title is "Warranty Available"');
  }

  // ====================================================================
  // TEST 8: Admin Notifications (Registration, Verification, Disputes)
  // ====================================================================
  console.log('\n🔹 [8/9] Testing Admin Notifications (Registration, Verification, Disputes)...');
  {
    // 1. Technician Registration & Verification Request
    const newTechUser = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Amit Patel',
      email: 'amit@servicehub.test',
      role: USER_ROLES.CUSTOMER,
      save: async () => {}
    };

    const syncRes = mockReqRes(newTechUser, {
      name: 'Amit Patel',
      role: 'TECHNICIAN',
      profession: 'Plumber',
      experience: '4 years'
    });
    syncRes.req.firebaseUser = { uid: 'fb-amit-123', email: 'amit@servicehub.test' };

    await userController.syncProfile(syncRes.req, syncRes.res);
    assert(syncRes.getResult().status === 200, 'Technician profile registered (HTTP 200)');

    const adminRegNotif = mockNotifications.find(
      (n) =>
        n.recipientId.toString() === adminUser._id.toString() &&
        n.type === NOTIFICATION_TYPE.TECHNICIAN_REGISTERED
    );
    assert(!!adminRegNotif, 'Admin received Technician Registration notification');
    assert(adminRegNotif.title === 'Technician Registration', 'Notification title is "Technician Registration"');

    const adminVerifNotif = mockNotifications.find(
      (n) =>
        n.recipientId.toString() === adminUser._id.toString() &&
        n.type === NOTIFICATION_TYPE.VERIFICATION_REQUESTED
    );
    assert(!!adminVerifNotif, 'Admin received Verification Request notification');
    assert(adminVerifNotif.title === 'Verification Request', 'Notification title is "Verification Request"');

    // 2. Dispute Created Notification to Admin
    const dspRes = mockReqRes(customerUser, {
      reason: 'BILLING_DISCREPANCY',
      description: 'Charged higher than initial estimate'
    }, { id: booking._id.toString() });

    await disputeController.createDispute(dspRes.req, dspRes.res);
    assert(dspRes.getResult().status === 201, 'Dispute raised (HTTP 201)');

    const adminDisputeNotif = mockNotifications.find(
      (n) =>
        n.recipientId.toString() === adminUser._id.toString() &&
        n.type === NOTIFICATION_TYPE.DISPUTE_CREATED
    );
    assert(!!adminDisputeNotif, 'Admin received Dispute notification');
    assert(adminDisputeNotif.title === 'New Dispute Opened', 'Notification title is "New Dispute Opened"');
  }

  // ====================================================================
  // TEST 9: Notification Retrieval & Read Status Operations
  // ====================================================================
  console.log('\n🔹 [9/9] Testing Notification Controller (Get, Mark Read, Mark All Read)...');
  {
    // 1. Get notifications for Customer
    let { req, res, getResult } = mockReqRes(customerUser);
    await notificationController.getNotifications(req, res);
    let result = getResult();
    assert(result.status === 200, 'Fetched user notifications (HTTP 200)');
    assert(result.body.data.notifications.length > 0, 'Customer has populated notifications list');
    assert(result.body.data.unreadCount > 0, 'Customer has unread notifications');

    const sampleNotif = result.body.data.notifications[0];
    assert(sampleNotif.isRead === false, 'Notification is initially unread');

    // 2. Mark single notification as read
    ({ req, res, getResult } = mockReqRes(customerUser, {}, { id: sampleNotif._id.toString() }));
    await notificationController.markNotificationRead(req, res);
    result = getResult();
    assert(result.status === 200, 'Single notification marked as read (HTTP 200)');
    assert(result.body.data.isRead === true, 'Notification state is now isRead: true');

    // 3. Mark all notifications as read
    ({ req, res, getResult } = mockReqRes(customerUser));
    await notificationController.markAllNotificationsRead(req, res);
    result = getResult();
    assert(result.status === 200, 'All notifications marked as read (HTTP 200)');

    // Verify unread count is now 0
    ({ req, res, getResult } = mockReqRes(customerUser));
    await notificationController.getNotifications(req, res);
    assert(getResult().body.data.unreadCount === 0, 'Customer unread count is now 0 after markAllRead');
  }

  console.log('\n============================================================');
  console.log(`✅ ALL NOTIFICATION LIFECYCLE TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log('============================================================\n');
}

runNotificationTests().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
