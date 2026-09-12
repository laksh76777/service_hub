/**
 * Automated Test Suite: Phase 8 ServiceHub Demo Payment Gateway
 *
 * Verifies all 10 required scenarios:
 * 1. success: Order created (DEMO_ORDER_...), verified (DEMO_TXN_...), Payment SUCCESS, paidAt recorded.
 * 2. failure: Payment FAILED, reason "Demo payment declined", booking remains payable.
 * 3. cancel: Payment CANCELLED, reason "Demo payment cancelled", booking remains valid for later payment.
 * 4. duplicate payment: Idempotent re-completion returns alreadyPaid: true, booking/invoice not charged twice.
 * 5. unauthorized payment: Non-owner customer and technician blocked with HTTP 403.
 * 6. wrong booking: Non-existent booking ID or payment ID returns HTTP 404.
 * 7. wrong amount: Tampered client amount overridden by authoritative server calculation; zero amount rejected.
 * 8. invoice update: Invoice status updated to PAID, paidAmount set, remainingAmount 0, paidAt recorded.
 * 9. booking update: Advances lifecycle from PAYMENT_PENDING -> PAYMENT_SUCCESS (or INVOICED), isPaid: true, paymentStatus: PAID.
 * 10. admin payment view: Admin can see all payments with booking, customer, technician, gateway, status.
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Booking = require('../src/models/Booking');
const Service = require('../src/models/Service');
const Estimate = require('../src/models/Estimate');
const Invoice = require('../src/models/Invoice');
const Payment = require('../src/models/Payment');
const Notification = require('../src/models/Notification');
Notification.create = async () => ({});
const paymentController = require('../src/controllers/paymentController');
const estimateController = require('../src/controllers/estimateController');
const adminController = require('../src/controllers/adminController');
const {
  PAYMENT_STATUS,
  PAYMENT_GATEWAY,
  BOOKING_STATUS,
  INVOICE_STATUS,
  ESTIMATE_STATUS,
  USER_ROLES,
  USER_STATUS
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
}

async function runPhase8Tests() {
  console.log('\n============================================================');
  console.log('🧪 SERVICEHUB PHASE 8 DEMO PAYMENT GATEWAY TEST SUITE');
  console.log('============================================================\n');

  // In-memory mock database collections
  const mockUsers = [];
  const mockServices = [];
  const mockBookings = [];
  const mockEstimates = [];
  const mockInvoices = [];
  const mockPayments = [];

  // Setup Users: Customer A, Customer B, Technician Rahul, Admin
  const custAId = new mongoose.Types.ObjectId();
  const customerA = {
    _id: custAId,
    name: 'Laksh Suthar',
    fullName: 'Laksh Suthar',
    email: 'laksh@servicehub.test',
    role: USER_ROLES.CUSTOMER,
    status: USER_STATUS.ACTIVE
  };

  const custBId = new mongoose.Types.ObjectId();
  const customerB = {
    _id: custBId,
    name: 'Intruder User',
    fullName: 'Intruder User',
    email: 'intruder@servicehub.test',
    role: USER_ROLES.CUSTOMER,
    status: USER_STATUS.ACTIVE
  };

  const techId = new mongoose.Types.ObjectId();
  const technician = {
    _id: techId,
    name: 'Rahul Sharma',
    fullName: 'Rahul Sharma',
    email: 'rahul@servicehub.test',
    role: USER_ROLES.TECHNICIAN,
    status: USER_STATUS.ACTIVE
  };

  const adminId = new mongoose.Types.ObjectId();
  const adminUser = {
    _id: adminId,
    name: 'Platform Admin',
    fullName: 'Platform Admin',
    email: 'admin@servicehub.test',
    role: USER_ROLES.ADMIN,
    status: USER_STATUS.ACTIVE
  };

  mockUsers.push(customerA, customerB, technician, adminUser);

  // Setup Service: AC Repair
  const serviceId = new mongoose.Types.ObjectId();
  const acService = {
    _id: serviceId,
    name: 'AC Repair',
    slug: 'ac-repair',
    basePrice: 599
  };
  mockServices.push(acService);

  // Helper to create query-chainable objects
  const makeQuery = (data) => {
    const q = {
      populate: () => q,
      sort: () => q,
      skip: () => q,
      limit: () => q,
      lean: () => Promise.resolve(JSON.parse(JSON.stringify(data))),
      then: (fn, rej) => Promise.resolve(data).then(fn, rej)
    };
    return q;
  };

  // Wire Mongoose Mocks
  User.findById = (id) => {
    const u = mockUsers.find((x) => x._id.toString() === id?.toString());
    return Promise.resolve(u || null);
  };

  Service.findById = (id) => {
    const s = mockServices.find((x) => x._id.toString() === id?.toString());
    return Promise.resolve(s || null);
  };

  function createBookingInstance(doc) {
    const inst = {
      ...doc,
      toObject() {
        return JSON.parse(JSON.stringify(this));
      },
      save: async function () {
        const idx = mockBookings.findIndex((b) => b._id.toString() === this._id.toString());
        if (idx !== -1) {
          mockBookings[idx] = { ...this };
        } else {
          mockBookings.push({ ...this });
        }
        return this;
      }
    };
    return inst;
  }

  Booking.findById = (id) => {
    const b = mockBookings.find((x) => x._id.toString() === id?.toString());
    if (!b) return makeQuery(null);

    const populated = {
      ...b,
      serviceId: mockServices.find((s) => s._id.toString() === (b.serviceId?._id || b.serviceId)?.toString()) || b.serviceId,
      customerId: mockUsers.find((u) => u._id.toString() === (b.customerId?._id || b.customerId)?.toString()) || b.customerId,
      technicianId: mockUsers.find((u) => u._id.toString() === (b.technicianId?._id || b.technicianId)?.toString()) || b.technicianId,
      providerId: mockUsers.find((u) => u._id.toString() === (b.providerId?._id || b.providerId)?.toString()) || b.providerId,
      toObject() {
        return JSON.parse(JSON.stringify(this));
      },
      save: async function () {
        const idx = mockBookings.findIndex((x) => x._id.toString() === this._id.toString());
        if (idx !== -1) {
          mockBookings[idx].status = this.status;
          mockBookings[idx].pricing = this.pricing;
          mockBookings[idx].paymentStatus = this.paymentStatus;
          mockBookings[idx].statusHistory = this.statusHistory;
          mockBookings[idx].jobExecution = this.jobExecution;
        }
        return this;
      }
    };
    return makeQuery(populated);
  };

  Invoice.findById = (id) => {
    const inv = mockInvoices.find((x) => x._id.toString() === id?.toString());
    if (!inv) return makeQuery(null);
    const populated = {
      ...inv,
      save: async function () {
        const idx = mockInvoices.findIndex((x) => x._id.toString() === this._id.toString());
        if (idx !== -1) {
          mockInvoices[idx].status = this.status;
          mockInvoices[idx].paidAmount = this.paidAmount;
          mockInvoices[idx].remainingAmount = this.remainingAmount;
          mockInvoices[idx].paidAt = this.paidAt;
        }
        return this;
      }
    };
    return makeQuery(populated);
  };

  Invoice.findOne = (query) => {
    const inv = mockInvoices.find((x) => {
      if (query.bookingId && x.bookingId.toString() !== query.bookingId.toString()) return false;
      if (query.status && query.status.$ne && x.status === query.status.$ne) return false;
      return true;
    });
    if (!inv) return makeQuery(null);
    return Invoice.findById(inv._id);
  };

  Estimate.find = (query) => {
    const list = mockEstimates.filter((x) => {
      if (query.bookingId && x.bookingId.toString() !== query.bookingId.toString()) return false;
      if (query.status && x.status !== query.status) return false;
      return true;
    });
    return makeQuery(list);
  };

  Estimate.findById = (id) => {
    const est = mockEstimates.find((x) => x._id.toString() === id?.toString());
    if (!est) return makeQuery(null);
    const populated = {
      ...est,
      save: async function () {
        const idx = mockEstimates.findIndex((x) => x._id.toString() === this._id.toString());
        if (idx !== -1) {
          mockEstimates[idx].status = this.status;
          mockEstimates[idx].approvedAt = this.approvedAt;
        }
        return this;
      }
    };
    return makeQuery(populated);
  };

  function createPaymentInstance(doc) {
    const inst = {
      ...doc,
      _id: doc._id || new mongoose.Types.ObjectId(),
      status: doc.status || PAYMENT_STATUS.PENDING,
      createdAt: doc.createdAt || new Date(),
      toObject() {
        return JSON.parse(JSON.stringify(this));
      },
      save: async function () {
        const idx = mockPayments.findIndex((x) => x._id.toString() === this._id.toString());
        if (idx !== -1) {
          mockPayments[idx] = { ...this };
        } else {
          mockPayments.push({ ...this });
        }
        return this;
      }
    };
    return inst;
  }

  Payment.create = async (doc) => {
    const inst = createPaymentInstance(doc);
    mockPayments.push({ ...inst });
    return inst;
  };

  Payment.findById = (id) => {
    const p = mockPayments.find((x) => x._id.toString() === id?.toString());
    if (!p) return makeQuery(null);
    const populated = {
      ...p,
      save: async function () {
        const idx = mockPayments.findIndex((x) => x._id.toString() === this._id.toString());
        if (idx !== -1) {
          mockPayments[idx] = { ...this };
        }
        return this;
      }
    };
    return makeQuery(populated);
  };

  Payment.findOne = (query) => {
    const p = mockPayments.find((x) => {
      if (query.bookingId && x.bookingId.toString() !== query.bookingId.toString()) return false;
      if (query.status) {
        if (query.status.$in && !query.status.$in.includes(x.status)) return false;
        if (typeof query.status === 'string' && x.status !== query.status) return false;
      }
      if (query._id && query._id.$ne && x._id.toString() === query._id.$ne.toString()) return false;
      return true;
    });
    if (!p) return makeQuery(null);
    return Payment.findById(p._id);
  };

  Payment.find = (query = {}) => {
    let list = [...mockPayments];
    if (query.bookingId) {
      list = list.filter((p) => p.bookingId.toString() === query.bookingId.toString());
    }
    if (query.status && query.status !== 'ALL') {
      list = list.filter((p) => p.status === query.status);
    }
    const populatedList = list.map((p) => ({
      ...p,
      bookingId: mockBookings.find((b) => b._id.toString() === p.bookingId?.toString()) || p.bookingId,
      customerId: mockUsers.find((u) => u._id.toString() === p.customerId?.toString()) || p.customerId,
      technicianId: mockUsers.find((u) => u._id.toString() === p.technicianId?.toString()) || p.technicianId
    }));
    return makeQuery(populatedList);
  };

  Payment.countDocuments = (query = {}) => {
    let list = [...mockPayments];
    if (query.status && query.status !== 'ALL') {
      list = list.filter((p) => p.status === query.status);
    }
    return Promise.resolve(list.length);
  };

  try {
    // ----------------------------------------------------
    // TEST 1: SUCCESS PAYMENT FLOW
    // ----------------------------------------------------
    console.log('🔹 [1/10] Testing Successful Payment Flow...');
    const booking1 = {
      _id: new mongoose.Types.ObjectId(),
      bookingNumber: 'BK-SUCC-001',
      customerId: customerA._id,
      technicianId: technician._id,
      providerId: technician._id,
      serviceId: acService._id,
      status: BOOKING_STATUS.PAYMENT_PENDING,
      pricing: { estimatedTotal: 1500, finalTotal: 1770, currency: 'INR' }
    };
    mockBookings.push(createBookingInstance(booking1));

    const invoice1 = {
      _id: new mongoose.Types.ObjectId(),
      invoiceNumber: 'INV-SUCC-001',
      bookingId: booking1._id,
      providerId: technician._id,
      customerId: customerA._id,
      total: 1770,
      paidAmount: 0,
      remainingAmount: 1770,
      status: INVOICE_STATUS.UNPAID
    };
    mockInvoices.push(invoice1);

    // 1a. Customer creates payment order
    let { req, res, getResult } = mockReqRes(customerA, { bookingId: booking1._id.toString() });
    await paymentController.createPaymentOrder(req, res);
    let orderRes = getResult();

    assert(orderRes.status === 201, 'createPaymentOrder returns HTTP 201');
    assert(orderRes.body.data.gateway === PAYMENT_GATEWAY.DEMO, 'Gateway is set to DEMO');
    assert(orderRes.body.data.gatewayOrderId.startsWith('DEMO_ORDER_'), 'Gateway order ID starts with DEMO_ORDER_');
    assert(orderRes.body.data.amount === 1770, 'Order amount matches trusted invoice amount (₹1770)');
    assert(orderRes.body.data.currency === 'INR', 'Currency is INR');
    assert(orderRes.body.data.technicianName === 'Rahul Sharma', 'Technician name is populated');

    const paymentId1 = orderRes.body.data.paymentId;

    // 1b. Customer completes payment with SUCCESS
    ({ req, res, getResult } = mockReqRes(customerA, {
      paymentId: paymentId1.toString(),
      outcome: 'SUCCESS'
    }));
    await paymentController.completePayment(req, res);
    let completeRes = getResult();

    assert(completeRes.status === 200, 'completePayment returns HTTP 200');
    assert(completeRes.body.data.success === true, 'Payment completion indicates success');
    assert(completeRes.body.data.payment.status === PAYMENT_STATUS.SUCCESS, 'Payment record is marked SUCCESS');
    assert(completeRes.body.data.payment.transactionId.startsWith('DEMO_TXN_'), 'Transaction ID generated with DEMO_TXN_');
    assert(completeRes.body.data.payment.paidAt != null, 'Payment paidAt timestamp recorded');
    assert(completeRes.body.data.payment.failureReason == null, 'Payment failureReason is null');

    // ----------------------------------------------------
    // TEST 2: FAILURE PAYMENT FLOW
    // ----------------------------------------------------
    console.log('\n🔹 [2/10] Testing Failed Payment Simulation...');
    const booking2 = {
      _id: new mongoose.Types.ObjectId(),
      bookingNumber: 'BK-FAIL-002',
      customerId: customerA._id,
      technicianId: technician._id,
      providerId: technician._id,
      serviceId: acService._id,
      status: BOOKING_STATUS.PAYMENT_PENDING,
      pricing: { estimatedTotal: 800, finalTotal: 800, currency: 'INR' }
    };
    mockBookings.push(createBookingInstance(booking2));

    ({ req, res, getResult } = mockReqRes(customerA, { bookingId: booking2._id.toString() }));
    await paymentController.createPaymentOrder(req, res);
    const failOrder = getResult().body.data;

    // Simulate failure
    ({ req, res, getResult } = mockReqRes(customerA, {
      paymentId: failOrder.paymentId.toString(),
      outcome: 'FAILED'
    }));
    await paymentController.completePayment(req, res);
    const failRes = getResult();

    assert(failRes.status === 200, 'Failed payment simulation returns HTTP 200');
    assert(failRes.body.data.success === false, 'Result success is false');
    assert(failRes.body.data.payment.status === PAYMENT_STATUS.FAILED, 'Payment record marked as FAILED');
    assert(failRes.body.data.payment.failureReason === 'Demo payment declined', 'Failure reason is "Demo payment declined"');

    // Booking remains payable!
    const failBookingRecord = mockBookings.find((b) => b._id.toString() === booking2._id.toString());
    assert(failBookingRecord.status === BOOKING_STATUS.PAYMENT_PENDING, 'Booking remains payable in PAYMENT_PENDING status');
    assert(!failBookingRecord.pricing.isPaid, 'Booking is not marked as paid');

    // ----------------------------------------------------
    // TEST 3: CANCEL PAYMENT FLOW
    // ----------------------------------------------------
    console.log('\n🔹 [3/10] Testing Cancelled Payment Simulation...');
    const booking3 = {
      _id: new mongoose.Types.ObjectId(),
      bookingNumber: 'BK-CNCL-003',
      customerId: customerA._id,
      technicianId: technician._id,
      providerId: technician._id,
      serviceId: acService._id,
      status: BOOKING_STATUS.PAYMENT_PENDING,
      pricing: { estimatedTotal: 1200, finalTotal: 1200, currency: 'INR' }
    };
    mockBookings.push(createBookingInstance(booking3));

    ({ req, res, getResult } = mockReqRes(customerA, { bookingId: booking3._id.toString() }));
    await paymentController.createPaymentOrder(req, res);
    const cancelOrder = getResult().body.data;

    // Simulate cancellation
    ({ req, res, getResult } = mockReqRes(customerA, {
      paymentId: cancelOrder.paymentId.toString(),
      outcome: 'CANCELLED'
    }));
    await paymentController.completePayment(req, res);
    const cancelRes = getResult();

    assert(cancelRes.status === 200, 'Cancelled payment simulation returns HTTP 200');
    assert(cancelRes.body.data.payment.status === PAYMENT_STATUS.CANCELLED, 'Payment record marked as CANCELLED');
    assert(cancelRes.body.data.payment.failureReason === 'Demo payment cancelled', 'Cancel reason recorded');

    const cancelBookingRecord = mockBookings.find((b) => b._id.toString() === booking3._id.toString());
    assert(cancelBookingRecord.status === BOOKING_STATUS.PAYMENT_PENDING, 'Booking remains valid for later payment');

    // ----------------------------------------------------
    // TEST 4: DUPLICATE PAYMENT PREVENTION
    // ----------------------------------------------------
    console.log('\n🔹 [4/10] Testing Duplicate Payment Prevention (Idempotency)...');
    // Attempt 1: Re-complete the already-successful payment
    ({ req, res, getResult } = mockReqRes(customerA, {
      paymentId: paymentId1.toString(),
      outcome: 'SUCCESS'
    }));
    await paymentController.completePayment(req, res);
    const dupRes1 = getResult();

    assert(dupRes1.status === 200, 'Re-completing successful payment returns HTTP 200');
    assert(dupRes1.body.data.alreadyPaid === true, 'Duplicate payment flagged as alreadyPaid: true');
    assert(dupRes1.body.data.payment.status === PAYMENT_STATUS.SUCCESS, 'Payment remains in SUCCESS status');

    // Attempt 2: Attempting to create a new payment order for already-paid booking must return 400
    ({ req, res, getResult } = mockReqRes(customerA, { bookingId: booking1._id.toString() }));
    await paymentController.createPaymentOrder(req, res);
    const dupOrderRes = getResult();

    assert(dupOrderRes.status === 400, 'Creating new order for already paid booking returns HTTP 400');
    assert(dupOrderRes.body.message.includes('already been paid'), 'Error explains booking is already paid');

    // ----------------------------------------------------
    // TEST 5: UNAUTHORIZED PAYMENT ATTEMPTS
    // ----------------------------------------------------
    console.log('\n🔹 [5/10] Testing Unauthorized Payment Rejections (Security)...');
    // Customer B attempts to create order for Customer A's booking
    ({ req, res, getResult } = mockReqRes(customerB, { bookingId: booking2._id.toString() }));
    await paymentController.createPaymentOrder(req, res);
    assert(getResult().status === 403, 'Customer B cannot create order for Customer A (HTTP 403)');

    // Customer B attempts to complete Customer A's payment
    ({ req, res, getResult } = mockReqRes(customerB, {
      paymentId: failOrder.paymentId.toString(),
      outcome: 'SUCCESS'
    }));
    await paymentController.completePayment(req, res);
    assert(getResult().status === 403, 'Customer B cannot complete Customer A payment (HTTP 403)');

    // Technician attempts to modify/complete payment status
    ({ req, res, getResult } = mockReqRes(technician, {
      paymentId: failOrder.paymentId.toString(),
      outcome: 'SUCCESS'
    }));
    await paymentController.completePayment(req, res);
    assert(getResult().status === 403, 'Technician cannot modify payment status (HTTP 403)');

    // Technician attempts to create payment order
    ({ req, res, getResult } = mockReqRes(technician, { bookingId: booking2._id.toString() }));
    await paymentController.createPaymentOrder(req, res);
    assert(getResult().status === 403, 'Technician cannot create payment order (HTTP 403)');

    // ----------------------------------------------------
    // TEST 6: WRONG BOOKING / WRONG PAYMENT ID
    // ----------------------------------------------------
    console.log('\n🔹 [6/10] Testing Wrong Booking & Payment ID Handling...');
    const fakeId1 = new mongoose.Types.ObjectId().toString();
    const fakeId2 = new mongoose.Types.ObjectId().toString();

    ({ req, res, getResult } = mockReqRes(customerA, { bookingId: fakeId1 }));
    await paymentController.createPaymentOrder(req, res);
    assert(getResult().status === 404, 'Non-existent booking returns HTTP 404');

    ({ req, res, getResult } = mockReqRes(customerA, { paymentId: fakeId2, outcome: 'SUCCESS' }));
    await paymentController.completePayment(req, res);
    assert(getResult().status === 404, 'Non-existent payment returns HTTP 404');

    // ----------------------------------------------------
    // TEST 7: WRONG AMOUNT / ZERO-TRUST PRICING
    // ----------------------------------------------------
    console.log('\n🔹 [7/10] Testing Wrong Amount & Authoritative Pricing...');
    // Client maliciously sends tampered amount { amount: 10 } for booking2 (which is 800)
    ({ req, res, getResult } = mockReqRes(customerA, {
      bookingId: booking2._id.toString(),
      amount: 10
    }));
    await paymentController.createPaymentOrder(req, res);
    const tamperedRes = getResult();

    assert(tamperedRes.status === 201, 'Order created successfully');
    assert(tamperedRes.body.data.amount === 800, 'Tampered amount ₹10 rejected; authoritative ₹800 enforced');

    // Zero payable amount booking
    const bookingZero = {
      _id: new mongoose.Types.ObjectId(),
      bookingNumber: 'BK-ZERO-004',
      customerId: customerA._id,
      technicianId: technician._id,
      providerId: technician._id,
      serviceId: acService._id,
      status: BOOKING_STATUS.REQUESTED,
      pricing: { estimatedTotal: 0, finalTotal: 0 }
    };
    mockBookings.push(createBookingInstance(bookingZero));

    ({ req, res, getResult } = mockReqRes(customerA, { bookingId: bookingZero._id.toString() }));
    await paymentController.createPaymentOrder(req, res);
    assert(getResult().status === 400, 'Booking with 0 payable amount rejected with HTTP 400');

    // ----------------------------------------------------
    // TEST 8: INVOICE UPDATE VERIFICATION
    // ----------------------------------------------------
    console.log('\n🔹 [8/10] Testing Invoice Status & Balance Updates...');
    const paidInvoice = mockInvoices.find((inv) => inv._id.toString() === invoice1._id.toString());
    assert(paidInvoice.status === INVOICE_STATUS.PAID, 'Invoice status updated to PAID');
    assert(paidInvoice.paidAmount === 1770, 'Invoice paidAmount matches ₹1770');
    assert(paidInvoice.remainingAmount === 0, 'Invoice remainingAmount is 0');
    assert(paidInvoice.paidAt != null, 'Invoice paidAt timestamp is recorded');

    // ----------------------------------------------------
    // TEST 9: BOOKING UPDATE & LIFECYCLE PROGRESSION
    // ----------------------------------------------------
    console.log('\n🔹 [9/10] Testing Booking Lifecycle Updates on Payment...');
    const paidBooking = mockBookings.find((b) => b._id.toString() === booking1._id.toString());
    assert(paidBooking.status === BOOKING_STATUS.PAYMENT_SUCCESS, 'Booking transitioned to PAYMENT_SUCCESS');
    assert(paidBooking.paymentStatus === 'PAID', 'Booking paymentStatus is PAID');
    assert(paidBooking.pricing.isPaid === true, 'Booking pricing.isPaid is true');
    assert(paidBooking.pricing.paidAmount === 1770, 'Booking pricing.paidAmount is ₹1770');
    assert(paidBooking.pricing.paidAt != null, 'Booking pricing.paidAt recorded');

    // Also test: Approved Estimate -> Booking moves to PAYMENT_PENDING
    const bookingEst = {
      _id: new mongoose.Types.ObjectId(),
      bookingNumber: 'BK-EST-005',
      customerId: customerA._id,
      technicianId: technician._id,
      providerId: technician._id,
      serviceId: acService._id,
      status: BOOKING_STATUS.ESTIMATE_SUBMITTED,
      pricing: { estimatedTotal: 1000 }
    };
    mockBookings.push(createBookingInstance(bookingEst));

    const estDoc = {
      _id: new mongoose.Types.ObjectId(),
      estimateNumber: 'EST-TEST-005',
      bookingId: bookingEst._id,
      providerId: technician._id,
      customerId: customerA._id,
      total: 1416,
      status: ESTIMATE_STATUS.PENDING_CUSTOMER
    };
    mockEstimates.push(estDoc);

    // Customer approves estimate
    ({ req, res, getResult } = mockReqRes(customerA, {}, { id: estDoc._id.toString() }));
    await estimateController.approveEstimate(req, res);
    assert(getResult().status === 200, 'Estimate approved successfully');

    const updatedEstBooking = mockBookings.find((b) => b._id.toString() === bookingEst._id.toString());
    assert(updatedEstBooking.status === BOOKING_STATUS.PAYMENT_PENDING, 'Booking advanced to PAYMENT_PENDING on estimate approval');
    assert(updatedEstBooking.pricing.finalTotal === 1416, 'Booking pricing updated to approved total (₹1416)');

    // ----------------------------------------------------
    // TEST 10: ADMIN PAYMENT VIEW
    // ----------------------------------------------------
    console.log('\n🔹 [10/10] Testing Admin Payment View (Oversight)...');
    ({ req, res, getResult } = mockReqRes(adminUser));
    await adminController.getAllPayments(req, res);
    const adminPayments = getResult();

    assert(adminPayments.status === 200, 'Admin getAllPayments returns HTTP 200');
    const paymentsList = adminPayments.body.data.payments;
    assert(Array.isArray(paymentsList), 'Payments returned as an array');
    assert(paymentsList.length >= 3, `Admin sees all payments (found ${paymentsList.length})`);

    const statuses = paymentsList.map((p) => p.status);
    assert(statuses.includes(PAYMENT_STATUS.SUCCESS), 'Admin view includes SUCCESS transactions');
    assert(statuses.includes(PAYMENT_STATUS.FAILED), 'Admin view includes FAILED transactions');
    assert(statuses.includes(PAYMENT_STATUS.CANCELLED), 'Admin view includes CANCELLED transactions');

    console.log('\n============================================================');
    console.log(`✅ ALL PHASE 8 TESTS PASSED: ${passedTests}/${totalTests}`);
    console.log('============================================================\n');
  } catch (error) {
    console.error('\n❌ Suite error:', error.message);
    process.exit(1);
  }
}

runPhase8Tests();
