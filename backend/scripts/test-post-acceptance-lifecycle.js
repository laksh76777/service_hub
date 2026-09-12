/**
 * Automated Test Suite: Post-Acceptance Service Lifecycle
 *
 * Verifies full end-to-end flow:
 * 1. Technician accepts request (REQUESTED -> ACCEPTED)
 * 2. Scheduled (ACCEPTED -> SCHEDULED)
 * 3. Inspection (SCHEDULED -> INSPECTION):
 *    - Records inspection notes, problem identified, required work, parts/materials.
 *    - Strict guard: Technician cannot directly charge customer from inspection.
 * 4. Estimate Creation:
 *    - Labor, Parts, Other charges, subtotal, 18% tax, total, notes, currency INR.
 *    - Zero-trust backend calculations (client-side total ignored).
 *    - Booking transitions to ESTIMATE_SUBMITTED.
 * 5. Customer Rejection Flow:
 *    - Customer rejects estimate with mandatory reason.
 *    - Booking returns to ESTIMATE_PENDING.
 *    - Payment is strictly prohibited while estimate is unapproved/rejected.
 * 6. Customer Approval Flow:
 *    - Customer approves revised estimate.
 *    - Booking advances to PAYMENT_PENDING.
 * 7. Payment via Demo Gateway:
 *    - Order created with authoritative amount.
 *    - Payment completion advances booking to PAYMENT_SUCCESS and marks pricing as paid.
 * 8. Work Execution:
 *    - Technician starts work (PAYMENT_SUCCESS -> WORK_IN_PROGRESS).
 *    - Technician completes work (WORK_IN_PROGRESS -> WORK_COMPLETED).
 * 9. Customer Completion Confirmation:
 *    - Customer confirms completion (WORK_COMPLETED -> CUSTOMER_CONFIRMED).
 * 10. Security & Role Enforcement:
 *     - Only assigned technician can create estimate and update work.
 *     - Only customer can approve/reject their estimate.
 *     - Cannot skip payment to start work.
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Booking = require('../src/models/Booking');
const Service = require('../src/models/Service');
const Estimate = require('../src/models/Estimate');
const Invoice = require('../src/models/Invoice');
Invoice.findOne = async () => null;
Invoice.create = async (d) => ({ _id: new mongoose.Types.ObjectId(), ...d });
const Warranty = require('../src/models/Warranty');
Warranty.findOne = async () => null;
Warranty.create = async (d) => ({ _id: new mongoose.Types.ObjectId(), ...d });
const Payment = require('../src/models/Payment');
const Notification = require('../src/models/Notification');
Notification.create = async () => ({});

const bookingController = require('../src/controllers/bookingController');
const estimateController = require('../src/controllers/estimateController');
const paymentController = require('../src/controllers/paymentController');

const {
  BOOKING_STATUS,
  ESTIMATE_STATUS,
  ESTIMATE_ITEM_TYPE,
  PAYMENT_STATUS,
  PAYMENT_GATEWAY,
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

async function runPostAcceptanceLifecycleTests() {
  console.log('\n============================================================');
  console.log('🧪 SERVICEHUB POST-ACCEPTANCE SERVICE LIFECYCLE TEST SUITE');
  console.log('============================================================\n');

  // In-memory collections
  const mockUsers = [];
  const mockServices = [];
  const mockBookings = [];
  const mockEstimates = [];
  const mockInvoices = [];
  const mockPayments = [];

  // Setup Users: Customer Laksh, Intruder Customer, Technician Rahul, Wrong Technician
  const customerId = new mongoose.Types.ObjectId();
  const customer = {
    _id: customerId,
    name: 'Laksh Suthar',
    fullName: 'Laksh Suthar',
    email: 'laksh@servicehub.test',
    role: USER_ROLES.CUSTOMER,
    status: USER_STATUS.ACTIVE
  };

  const intruderId = new mongoose.Types.ObjectId();
  const intruderCustomer = {
    _id: intruderId,
    name: 'Intruder Customer',
    fullName: 'Intruder Customer',
    email: 'intruder@servicehub.test',
    role: USER_ROLES.CUSTOMER,
    status: USER_STATUS.ACTIVE
  };

  const technicianId = new mongoose.Types.ObjectId();
  const technician = {
    _id: technicianId,
    name: 'Rahul Sharma',
    fullName: 'Rahul Sharma',
    email: 'ac@servicehub.test',
    role: USER_ROLES.TECHNICIAN,
    status: USER_STATUS.ACTIVE
  };

  const wrongTechnicianId = new mongoose.Types.ObjectId();
  const wrongTechnician = {
    _id: wrongTechnicianId,
    name: 'Imran Khan',
    fullName: 'Imran Khan',
    email: 'plumber@servicehub.test',
    role: USER_ROLES.TECHNICIAN,
    status: USER_STATUS.ACTIVE
  };

  mockUsers.push(customer, intruderCustomer, technician, wrongTechnician);

  const serviceId = new mongoose.Types.ObjectId();
  const acService = {
    _id: serviceId,
    name: 'AC Repair',
    slug: 'ac-repair',
    basePrice: 599
  };
  mockServices.push(acService);

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

  // Mongoose query mocks
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
          mockBookings[idx].rejectionReason = this.rejectionReason;
        }
        return this;
      }
    };
    return makeQuery(populated);
  };

  Estimate.find = (query = {}) => {
    let list = [...mockEstimates];
    if (query.bookingId) {
      list = list.filter((x) => x.bookingId.toString() === query.bookingId.toString());
    }
    if (query.status) {
      if (typeof query.status === 'string') {
        list = list.filter((x) => x.status === query.status);
      } else if (query.status.$in) {
        list = list.filter((x) => query.status.$in.includes(x.status));
      }
    }
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
          mockEstimates[idx].rejectionReason = this.rejectionReason;
          mockEstimates[idx].approvedAt = this.approvedAt;
          mockEstimates[idx].rejectedAt = this.rejectedAt;
        }
        return this;
      }
    };
    return makeQuery(populated);
  };

  Estimate.create = async (doc) => {
    const inst = {
      ...doc,
      _id: doc._id || new mongoose.Types.ObjectId(),
      status: doc.status || ESTIMATE_STATUS.PENDING_CUSTOMER,
      currency: doc.currency || 'INR',
      createdAt: new Date(),
      toObject() {
        return JSON.parse(JSON.stringify(this));
      },
      save: async function () {
        const idx = mockEstimates.findIndex((x) => x._id.toString() === this._id.toString());
        if (idx !== -1) mockEstimates[idx] = { ...this };
        else mockEstimates.push({ ...this });
        return this;
      }
    };
    mockEstimates.push(inst);
    return inst;
  };

  Estimate.updateMany = async (filter, update) => {
    mockEstimates.forEach((est) => {
      if (est.bookingId.toString() === filter.bookingId.toString() && (!filter.status || filter.status.$in.includes(est.status))) {
        Object.assign(est, update);
      }
    });
    return { modifiedCount: 1 };
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

  Invoice.findById = (id) => {
    const inv = mockInvoices.find((x) => x._id.toString() === id?.toString());
    if (!inv) return makeQuery(null);
    const populated = {
      ...inv,
      save: async function () {
        const idx = mockInvoices.findIndex((x) => x._id.toString() === this._id.toString());
        if (idx !== -1) mockInvoices[idx] = { ...this };
        return this;
      }
    };
    return makeQuery(populated);
  };

  Payment.create = async (doc) => {
    const inst = {
      ...doc,
      _id: doc._id || new mongoose.Types.ObjectId(),
      status: doc.status || PAYMENT_STATUS.PENDING,
      createdAt: new Date(),
      toObject() {
        return JSON.parse(JSON.stringify(this));
      },
      save: async function () {
        const idx = mockPayments.findIndex((x) => x._id.toString() === this._id.toString());
        if (idx !== -1) mockPayments[idx] = { ...this };
        else mockPayments.push({ ...this });
        return this;
      }
    };
    mockPayments.push(inst);
    return inst;
  };

  Payment.findById = (id) => {
    const p = mockPayments.find((x) => x._id.toString() === id?.toString());
    if (!p) return makeQuery(null);
    const populated = {
      ...p,
      save: async function () {
        const idx = mockPayments.findIndex((x) => x._id.toString() === this._id.toString());
        if (idx !== -1) mockPayments[idx] = { ...this };
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

  try {
    // ----------------------------------------------------
    // 1. Initial State: REQUESTED -> ACCEPTED
    // ----------------------------------------------------
    console.log('🔹 [1/10] Technician accepts request (REQUESTED -> ACCEPTED)...');
    const booking = createBookingInstance({
      _id: new mongoose.Types.ObjectId(),
      bookingNumber: 'BK-CYCLE-001',
      customerId: customer._id,
      technicianId: technician._id,
      providerId: technician._id,
      serviceId: acService._id,
      status: BOOKING_STATUS.REQUESTED,
      address: {
        addressLine1: 'Flat 402, Green Meadows',
        streetAddress: 'Flat 402, Green Meadows',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001'
      },
      pricing: { estimatedTotal: 599, finalTotal: 0, currency: 'INR' },
      statusHistory: [],
      jobExecution: {}
    });
    mockBookings.push(booking);

    // Technician accepts
    let { req, res, getResult } = mockReqRes(technician, { status: BOOKING_STATUS.ACCEPTED });
    req.params = { id: booking._id.toString() };
    await bookingController.transitionBookingStatus(req, res);
    let result = getResult();

    assert(result.status === 200, 'Technician accepts booking successfully (HTTP 200)');
    assert(result.body.booking.status === BOOKING_STATUS.ACCEPTED, 'Status transitioned to ACCEPTED');
    assert(result.body.booking.address.streetAddress === 'Flat 402, Green Meadows', 'Full street address unlocked upon acceptance');

    // ----------------------------------------------------
    // 2. ACCEPTED -> SCHEDULED
    // ----------------------------------------------------
    console.log('\n🔹 [2/10] Technician schedules appointment (ACCEPTED -> SCHEDULED)...');
    ({ req, res, getResult } = mockReqRes(technician, { status: BOOKING_STATUS.SCHEDULED }));
    req.params = { id: booking._id.toString() };
    await bookingController.transitionBookingStatus(req, res);
    result = getResult();

    assert(result.status === 200, 'Transition to SCHEDULED succeeds (HTTP 200)');
    assert(result.body.booking.status === BOOKING_STATUS.SCHEDULED, 'Status transitioned to SCHEDULED');

    // ----------------------------------------------------
    // 3. SCHEDULED -> INSPECTION & Notes Recording
    // ----------------------------------------------------
    console.log('\n🔹 [3/10] Technician starts INSPECTION & logs diagnostic findings...');
    ({ req, res, getResult } = mockReqRes(technician, { status: BOOKING_STATUS.INSPECTION }));
    req.params = { id: booking._id.toString() };
    await bookingController.transitionBookingStatus(req, res);
    result = getResult();

    assert(result.status === 200, 'Transition to INSPECTION succeeds (HTTP 200)');
    assert(result.body.booking.status === BOOKING_STATUS.INSPECTION, 'Status is INSPECTION');

    // Technician records inspection notes, problem identified, required work, parts
    ({ req, res, getResult } = mockReqRes(technician, {
      inspectionNotes: 'AC compressor humming loudly, high discharge pressure observed.',
      problemIdentified: 'Capacitor degraded (15uF instead of 45uF) and condenser coil clogged with debris.',
      requiredWork: 'Replace 45uF dual run capacitor and perform deep chemical foam coil cleaning.',
      partsUsed: [
        { name: '45uF Dual Run Capacitor', quantity: 1, cost: 650 }
      ]
    }));
    req.params = { id: booking._id.toString() };
    await bookingController.updateJobExecution(req, res);
    result = getResult();

    assert(result.status === 200, 'Inspection details recorded (HTTP 200)');
    assert(result.body.booking.jobExecution.inspectionNotes.includes('compressor humming'), 'Inspection notes recorded');
    assert(result.body.booking.jobExecution.problemIdentified.includes('Capacitor degraded'), 'Problem identified recorded');
    assert(result.body.booking.jobExecution.requiredWork.includes('Replace 45uF'), 'Required work recorded');
    assert(result.body.booking.jobExecution.partsUsed.length === 1, 'Potential parts recorded');

    // STRICT SECURITY RULE VERIFICATION: Inspection must NOT directly charge the customer
    const inspectBooking = mockBookings.find((b) => b._id.toString() === booking._id.toString());
    assert(inspectBooking.pricing.finalTotal === 0, 'ZERO-DIRECT-CHARGE: Booking pricing.finalTotal remains 0 after inspection logging');
    assert(!inspectBooking.pricing.isPaid, 'Booking remains unpaid');

    // ----------------------------------------------------
    // 4. ESTIMATE CREATION (Zero-Trust Backend Calculation)
    // ----------------------------------------------------
    console.log('\n🔹 [4/10] Technician creates Estimate with Labor, Parts & Notes...');
    ({ req, res, getResult } = mockReqRes(technician, {
      items: [
        { description: 'Technician Labor & Chemical Cleaning', type: 'LABOUR', quantity: 1, unitPrice: 500 },
        { description: '45uF Dual Run Capacitor (Havells)', type: 'PART', quantity: 1, unitPrice: 650 },
        { description: 'Safety & Equipment Surcharge', type: 'OTHER', quantity: 1, unitPrice: 150 }
      ],
      notes: 'Includes 90-day warranty on replaced capacitor component.',
      // Malicious client tries to send tampered total
      total: 10
    }));
    req.params = { id: booking._id.toString() };
    await estimateController.createEstimate(req, res);
    result = getResult();

    assert(result.status === 201, 'Estimate created with HTTP 201');
    const est1 = result.body.estimate;
    assert(est1.estimateNumber.startsWith('EST-'), 'Estimate number generated');
    assert(est1.subtotal === 1300, 'Subtotal calculated authoritatively (500 + 650 + 150 = 1300)');
    assert(est1.taxes === 234, '18% GST calculated authoritatively (234)');
    assert(est1.total === 1534, 'Total is authoritatively ₹1534 (client tampered total ₹10 ignored)');
    assert(est1.currency === 'INR', 'Currency is INR');
    assert(est1.status === ESTIMATE_STATUS.PENDING_CUSTOMER, 'Status is PENDING_CUSTOMER');

    // Booking transitioned to ESTIMATE_SUBMITTED
    const postEstBooking = mockBookings.find((b) => b._id.toString() === booking._id.toString());
    assert(postEstBooking.status === BOOKING_STATUS.ESTIMATE_SUBMITTED, 'Booking transitioned to ESTIMATE_SUBMITTED');

    // ----------------------------------------------------
    // 5. CUSTOMER REJECTION FLOW & PAYMENT PROHIBITION
    // ----------------------------------------------------
    console.log('\n🔹 [5/10] Customer rejects estimate -> Reason logged & Payment Prohibited...');
    ({ req, res, getResult } = mockReqRes(customer, {
      reason: 'Surcharge seems too high for standard diagnostic visit.'
    }));
    req.params = { id: est1._id.toString() };
    await estimateController.rejectEstimate(req, res);
    result = getResult();

    assert(result.status === 200, 'Estimate rejected by customer (HTTP 200)');
    assert(result.body.estimate.status === ESTIMATE_STATUS.REJECTED, 'Estimate status is REJECTED');
    assert(result.body.estimate.rejectionReason === 'Surcharge seems too high for standard diagnostic visit.', 'Rejection reason recorded');

    // Booking must return to ESTIMATE_PENDING
    const rejectedBooking = mockBookings.find((b) => b._id.toString() === booking._id.toString());
    assert(rejectedBooking.status === BOOKING_STATUS.ESTIMATE_PENDING, 'Booking returned to ESTIMATE_PENDING');

    // STRICT RULE: Payment cannot be initiated for rejected/unapproved estimate
    ({ req, res, getResult } = mockReqRes(customer, { bookingId: booking._id.toString() }));
    await paymentController.createPaymentOrder(req, res);
    const blockedPayRes = getResult();

    assert(blockedPayRes.status === 400, 'Payment order creation strictly blocked when estimate is rejected (HTTP 400)');
    assert(blockedPayRes.body.message.toLowerCase().includes('estimate must be approved first'), 'Message informs customer estimate approval is required');

    // ----------------------------------------------------
    // 6. ESTIMATE RE-SUBMISSION & CUSTOMER APPROVAL
    // ----------------------------------------------------
    console.log('\n🔹 [6/10] Technician submits revised estimate -> Customer APPROVES...');
    // Technician waives surcharge
    ({ req, res, getResult } = mockReqRes(technician, {
      items: [
        { description: 'Technician Labor & Chemical Cleaning', type: 'LABOUR', quantity: 1, unitPrice: 500 },
        { description: '45uF Dual Run Capacitor (Havells)', type: 'PART', quantity: 1, unitPrice: 650 }
      ],
      notes: 'Revised estimate: Waived equipment surcharge as goodwill.'
    }));
    req.params = { id: booking._id.toString() };
    await estimateController.createEstimate(req, res);
    const est2 = getResult().body.estimate;

    assert(est2.subtotal === 1150, 'Revised subtotal is ₹1150');
    assert(est2.taxes === 207, 'Revised taxes is ₹207');
    assert(est2.total === 1357, 'Revised total is ₹1357');

    // Customer approves revised estimate
    ({ req, res, getResult } = mockReqRes(customer));
    req.params = { id: est2._id.toString() };
    await estimateController.approveEstimate(req, res);
    result = getResult();

    assert(result.status === 200, 'Customer approves revised estimate (HTTP 200)');
    assert(result.body.estimate.status === ESTIMATE_STATUS.APPROVED, 'Estimate status is APPROVED');

    // Booking moves to PAYMENT_PENDING with approved pricing
    const approvedBooking = mockBookings.find((b) => b._id.toString() === booking._id.toString());
    assert(approvedBooking.status === BOOKING_STATUS.PAYMENT_PENDING, 'Booking transitioned to PAYMENT_PENDING');
    assert(approvedBooking.pricing.finalTotal === 1357, 'Booking pricing.finalTotal set to approved estimate total (₹1357)');

    // ----------------------------------------------------
    // 7. DEMO PAYMENT GATEWAY EXECUTION
    // ----------------------------------------------------
    console.log('\n🔹 [7/10] Customer pays via Demo Payment Gateway...');
    ({ req, res, getResult } = mockReqRes(customer, { bookingId: booking._id.toString() }));
    await paymentController.createPaymentOrder(req, res);
    const paymentOrder = getResult().body.data;

    assert(paymentOrder.amount === 1357, 'Payment order amount is ₹1357');
    assert(paymentOrder.gateway === PAYMENT_GATEWAY.DEMO, 'Payment gateway is DEMO');
    assert(paymentOrder.gatewayOrderId.startsWith('DEMO_ORDER_'), 'Gateway order ID starts with DEMO_ORDER_');

    // Complete payment successfully
    ({ req, res, getResult } = mockReqRes(customer, {
      paymentId: paymentOrder.paymentId.toString(),
      outcome: 'SUCCESS'
    }));
    await paymentController.completePayment(req, res);
    const payResult = getResult();

    assert(payResult.status === 200, 'Payment completed successfully (HTTP 200)');
    assert(payResult.body.data.payment.status === PAYMENT_STATUS.SUCCESS, 'Payment record marked as SUCCESS');
    assert(payResult.body.data.payment.transactionId.startsWith('DEMO_TXN_'), 'Transaction ID generated with DEMO_TXN_');

    // Booking advances to PAYMENT_SUCCESS
    const postPayBooking = mockBookings.find((b) => b._id.toString() === booking._id.toString());
    assert(postPayBooking.status === BOOKING_STATUS.PAYMENT_SUCCESS, 'Booking transitioned to PAYMENT_SUCCESS');
    assert(postPayBooking.pricing.isPaid === true, 'Booking pricing.isPaid is true');
    assert(postPayBooking.paymentStatus === 'PAID', 'Booking paymentStatus is PAID');

    // ----------------------------------------------------
    // 8. WORK EXECUTION (WORK_IN_PROGRESS -> WORK_COMPLETED)
    // ----------------------------------------------------
    console.log('\n🔹 [8/10] Technician executes service work (WORK_IN_PROGRESS -> WORK_COMPLETED)...');
    // Technician starts work
    ({ req, res, getResult } = mockReqRes(technician, { status: BOOKING_STATUS.WORK_IN_PROGRESS }));
    req.params = { id: booking._id.toString() };
    await bookingController.transitionBookingStatus(req, res);
    result = getResult();

    assert(result.status === 200, 'Transition to WORK_IN_PROGRESS succeeds (HTTP 200)');
    assert(result.body.booking.status === BOOKING_STATUS.WORK_IN_PROGRESS, 'Status is WORK_IN_PROGRESS');

    // Technician marks work completed
    ({ req, res, getResult } = mockReqRes(technician, { status: BOOKING_STATUS.WORK_COMPLETED }));
    req.params = { id: booking._id.toString() };
    await bookingController.transitionBookingStatus(req, res);
    result = getResult();

    assert(result.status === 200, 'Transition to WORK_COMPLETED succeeds (HTTP 200)');
    assert(result.body.booking.status === BOOKING_STATUS.WORK_COMPLETED, 'Status is WORK_COMPLETED');

    // ----------------------------------------------------
    // 9. CUSTOMER COMPLETION CONFIRMATION
    // ----------------------------------------------------
    console.log('\n🔹 [9/10] Customer inspects & confirms completion (CUSTOMER_CONFIRMED)...');
    ({ req, res, getResult } = mockReqRes(customer, { status: BOOKING_STATUS.CUSTOMER_CONFIRMED }));
    req.params = { id: booking._id.toString() };
    await bookingController.transitionBookingStatus(req, res);
    result = getResult();

    assert(result.status === 200, 'Customer confirms completion (HTTP 200)');
    assert(result.body.booking.status === BOOKING_STATUS.CUSTOMER_CONFIRMED, 'Status is CUSTOMER_CONFIRMED');

    // ----------------------------------------------------
    // 10. SECURITY & RBAC ENFORCEMENT
    // ----------------------------------------------------
    console.log('\n🔹 [10/10] Verifying Security Constraints & Role Access...');
    // A. Wrong technician cannot update job execution
    ({ req, res, getResult } = mockReqRes(wrongTechnician, { workNotes: 'Malicious update' }));
    req.params = { id: booking._id.toString() };
    await bookingController.updateJobExecution(req, res);
    assert(getResult().status === 403, 'Unassigned technician cannot update work details (HTTP 403)');

    // B. Customer cannot update technician job execution
    ({ req, res, getResult } = mockReqRes(customer, { workNotes: 'Customer note' }));
    req.params = { id: booking._id.toString() };
    await bookingController.updateJobExecution(req, res);
    assert(getResult().status === 403, 'Customer cannot update technician job execution (HTTP 403)');

    // C. Intruder customer cannot approve or reject another customer estimate
    ({ req, res, getResult } = mockReqRes(intruderCustomer));
    req.params = { id: est2._id.toString() };
    await estimateController.approveEstimate(req, res);
    assert(getResult().status === 403, 'Intruder customer cannot approve another customer estimate (HTTP 403)');

    // D. Technician cannot approve estimate on behalf of customer
    ({ req, res, getResult } = mockReqRes(technician));
    req.params = { id: est2._id.toString() };
    await estimateController.approveEstimate(req, res);
    assert(getResult().status === 403, 'Technician cannot approve estimate on customer behalf (HTTP 403)');

    // E. Technician cannot start work directly from PAYMENT_PENDING without payment
    const unpaIdBooking = createBookingInstance({
      _id: new mongoose.Types.ObjectId(),
      bookingNumber: 'BK-UNPAID-001',
      customerId: customer._id,
      technicianId: technician._id,
      providerId: technician._id,
      serviceId: acService._id,
      status: BOOKING_STATUS.PAYMENT_PENDING,
      pricing: { estimatedTotal: 500, finalTotal: 500, isPaid: false },
      statusHistory: [],
      jobExecution: {}
    });
    mockBookings.push(unpaIdBooking);

    ({ req, res, getResult } = mockReqRes(technician, { status: BOOKING_STATUS.WORK_IN_PROGRESS }));
    req.params = { id: unpaIdBooking._id.toString() };
    await bookingController.transitionBookingStatus(req, res);
    assert(getResult().status === 400, 'Technician cannot jump directly to WORK_IN_PROGRESS while payment is pending (HTTP 400)');

    console.log('\n============================================================');
    console.log(`✅ ALL POST-ACCEPTANCE LIFECYCLE TESTS PASSED: ${passedTests}/${totalTests}`);
    console.log('============================================================\n');
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  }
}

runPostAcceptanceLifecycleTests();
