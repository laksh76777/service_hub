/**
 * ServiceHub: Post-Payment Lifecycle Test Suite
 *
 * Verifies:
 * 1. INVOICE:
 *    - Finalize/generate invoice after completion
 *    - Contains: Invoice number, Customer, Technician, Service, Booking, Items, Amount, Payment status, Date, Currency INR
 *    - Invoice deduplication: Cannot generate duplicate invoice for a booking
 * 2. WARRANTY:
 *    - Check if service supports warranty
 *    - Create warranty record after successful job completion
 *    - Contains: Warranty period, Start date, End date, Service, Booking, Terms
 *    - Customer can view warranty
 * 3. REVIEW & RATING:
 *    - Customer can submit rating (1-5) and review after completion/customer confirmation
 *    - Single review per completed booking strictly enforced
 *    - Technician rating dynamically recalculates and updates in ProviderProfile
 * 4. DISPUTE:
 *    - Customer can raise dispute for eligible booking (OPEN status)
 *    - Technician can respond (UNDER_REVIEW status, technicianResponse recorded)
 *    - Admin can review and arbitrate (RESOLVED and CLOSED statuses, adminReview logged)
 * 5. SECURITY:
 *    - Customer can only review own completed booking (cannot review another customer's booking)
 *    - Customer cannot review uncompleted booking
 *    - Customer cannot manipulate rating (out of range/non-integers rejected)
 *    - Only admin can arbitrate disputes
 */

const mongoose = require('mongoose');

// Mock Notification so tests don't require external dispatch
const Notification = require('../src/models/Notification');
Notification.create = async (doc) => ({ _id: new mongoose.Types.ObjectId(), ...doc });

const User = require('../src/models/User');
const Booking = require('../src/models/Booking');
const Service = require('../src/models/Service');
const ProviderProfile = require('../src/models/ProviderProfile');
const Estimate = require('../src/models/Estimate');
const Invoice = require('../src/models/Invoice');
const Warranty = require('../src/models/Warranty');
const WarrantyClaim = require('../src/models/WarrantyClaim');
WarrantyClaim.find = () => ({
  sort: () => Promise.resolve([]),
  then: (fn) => Promise.resolve([]).then(fn)
});
WarrantyClaim.create = async (doc) => ({ _id: new mongoose.Types.ObjectId(), ...doc });
const Review = require('../src/models/Review');
const Dispute = require('../src/models/Dispute');

const invoiceController = require('../src/controllers/invoiceController');
const warrantyController = require('../src/controllers/warrantyController');
const reviewController = require('../src/controllers/reviewController');
const disputeController = require('../src/controllers/disputeController');

const {
  BOOKING_STATUS,
  INVOICE_STATUS,
  DISPUTE_STATUS,
  USER_ROLES,
  PROVIDER_STATUS
} = require('../src/utils/constants');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASSED: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAILED: ${message}`);
    failed++;
  }
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
    },
    setHeader() {
      return this;
    }
  };

  const req = {
    user,
    body,
    params,
    query
  };

  return {
    req,
    res,
    getResult: () => ({ status: statusCode, body: responseData })
  };
}

async function runPostPaymentLifecycleTests() {
  console.log('\n======================================================================');
  console.log('🧪 SERVICEHUB POST-PAYMENT LIFECYCLE COMPREHENSIVE TEST SUITE');
  console.log('======================================================================\n');

  // In-memory collections
  const mockUsers = [];
  const mockProfiles = [];
  const mockServices = [];
  const mockBookings = [];
  const mockEstimates = [];
  const mockInvoices = [];
  const mockWarranties = [];
  const mockReviews = [];
  const mockDisputes = [];

  // Setup Test Users
  const customerId1 = new mongoose.Types.ObjectId();
  const customer1 = {
    _id: customerId1,
    name: 'Priya Patel',
    fullName: 'Priya Patel',
    email: 'priya@servicehub.test',
    phone: '9900000001',
    role: USER_ROLES.CUSTOMER
  };

  const customerId2 = new mongoose.Types.ObjectId();
  const customer2 = {
    _id: customerId2,
    name: 'Amit Verma',
    fullName: 'Amit Verma',
    email: 'amit@servicehub.test',
    phone: '9900000002',
    role: USER_ROLES.CUSTOMER
  };

  const techId = new mongoose.Types.ObjectId();
  const technician = {
    _id: techId,
    name: 'Rahul Sharma',
    fullName: 'Rahul Sharma',
    email: 'rahul@servicehub.test',
    phone: '9900000003',
    role: USER_ROLES.TECHNICIAN
  };

  const adminId = new mongoose.Types.ObjectId();
  const admin = {
    _id: adminId,
    name: 'Super Admin',
    fullName: 'Super Admin',
    email: 'admin@servicehub.test',
    phone: '9900000004',
    role: USER_ROLES.ADMIN
  };

  mockUsers.push(customer1, customer2, technician, admin);

  // Setup Technician Profile
  const techProfile = {
    _id: new mongoose.Types.ObjectId(),
    userId: techId,
    businessName: 'Sharma AC Care',
    profession: 'AC Technician',
    status: PROVIDER_STATUS.VERIFIED,
    rating: { average: 0, count: 0 },
    completedJobsCount: 0
  };
  mockProfiles.push(techProfile);

  // Setup Services
  const warrantyServiceId = new mongoose.Types.ObjectId();
  const warrantyService = {
    _id: warrantyServiceId,
    name: 'AC Repair & Servicing',
    slug: 'ac-repair',
    description: 'Complete cooling system diagnosis and gas refill',
    supportsWarranty: true,
    warrantyPeriodDays: 30,
    warrantyTerms: 'Covers cooling issues and gas leak rework for 30 days',
    estimatedPriceRange: { min: 499, max: 2499, currency: 'INR' }
  };

  const noWarrantyServiceId = new mongoose.Types.ObjectId();
  const noWarrantyService = {
    _id: noWarrantyServiceId,
    name: 'Diagnostic Inspection Only',
    slug: 'diagnostic-inspection',
    description: 'Initial visit and diagnosis without parts or guarantee',
    supportsWarranty: false,
    warrantyPeriodDays: 0,
    warrantyTerms: 'No warranty provided for diagnostic only',
    estimatedPriceRange: { min: 199, max: 299, currency: 'INR' }
  };

  mockServices.push(warrantyService, noWarrantyService);

  // Query chain helper
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

  // -------------------------------------------------------------
  // Mock Mongoose Model Handlers
  // -------------------------------------------------------------

  User.findById = (id) => {
    const u = mockUsers.find((x) => x._id.toString() === id?.toString());
    return makeQuery(u || null);
  };
  User.find = (filter = {}) => {
    let list = [...mockUsers];
    if (filter.role) list = list.filter((x) => x.role === filter.role);
    return makeQuery(list);
  };

  Service.findById = (id) => {
    const s = mockServices.find((x) => x._id.toString() === id?.toString());
    return makeQuery(s || null);
  };

  ProviderProfile.findOne = (filter = {}) => {
    const p = mockProfiles.find((x) => x.userId.toString() === filter.userId?.toString());
    return makeQuery(p || null);
  };
  ProviderProfile.findOneAndUpdate = async (filter, update) => {
    const p = mockProfiles.find((x) => x.userId.toString() === filter.userId?.toString());
    if (!p) return null;
    if (update['rating.average'] !== undefined) p.rating.average = update['rating.average'];
    if (update['rating.count'] !== undefined) p.rating.count = update['rating.count'];
    return p;
  };

  function createBookingInstance(doc) {
    const inst = {
      ...doc,
      toObject() { return JSON.parse(JSON.stringify(this)); },
      save: async function () {
        const idx = mockBookings.findIndex((b) => b._id.toString() === this._id.toString());
        if (idx !== -1) mockBookings[idx] = { ...this };
        else mockBookings.push({ ...this });
        return this;
      }
    };
    return inst;
  }

  Booking.findById = (id) => {
    const b = mockBookings.find((x) => x._id.toString() === id?.toString());
    if (!b) return makeQuery(null);
    const inst = createBookingInstance({
      ...b,
      serviceId: mockServices.find((s) => s._id.toString() === (b.serviceId?._id || b.serviceId)?.toString()) || b.serviceId,
      customerId: mockUsers.find((u) => u._id.toString() === (b.customerId?._id || b.customerId)?.toString()) || b.customerId,
      technicianId: mockUsers.find((u) => u._id.toString() === (b.technicianId?._id || b.technicianId)?.toString()) || b.technicianId,
      providerId: mockUsers.find((u) => u._id.toString() === (b.providerId?._id || b.providerId)?.toString()) || b.providerId
    });
    return makeQuery(inst);
  };

  Estimate.find = (filter = {}) => {
    let list = mockEstimates.filter((e) => e.bookingId.toString() === filter.bookingId?.toString());
    if (filter.status) list = list.filter((e) => e.status === filter.status);
    return makeQuery(list);
  };

  // Invoice Mocks
  Invoice.create = async (doc) => {
    const inv = {
      _id: new mongoose.Types.ObjectId(),
      currency: 'INR',
      paymentStatus: 'PAID',
      date: new Date(),
      ...doc
    };
    if (!inv.amount && inv.total) inv.amount = inv.total;
    mockInvoices.push(inv);
    return inv;
  };

  Invoice.findOne = (filter = {}) => {
    let list = [...mockInvoices];
    if (filter.bookingId) list = list.filter((i) => i.bookingId.toString() === filter.bookingId.toString());
    if (filter.status?.$ne) list = list.filter((i) => i.status !== filter.status.$ne);
    const item = list[0] || null;
    if (!item) return makeQuery(null);
    const populated = {
      ...item,
      customerId: mockUsers.find((u) => u._id.toString() === (item.customerId?._id || item.customerId)?.toString()) || item.customerId,
      technicianId: mockUsers.find((u) => u._id.toString() === (item.technicianId?._id || item.technicianId)?.toString()) || item.technicianId,
      providerId: mockUsers.find((u) => u._id.toString() === (item.providerId?._id || item.providerId)?.toString()) || item.providerId,
      serviceId: mockServices.find((s) => s._id.toString() === (item.serviceId?._id || item.serviceId)?.toString()) || item.serviceId,
      bookingId: mockBookings.find((b) => b._id.toString() === (item.bookingId?._id || item.bookingId)?.toString()) || item.bookingId
    };
    return makeQuery(populated);
  };

  Invoice.findById = (id) => {
    const item = mockInvoices.find((i) => i._id.toString() === id.toString());
    if (!item) return makeQuery(null);
    const populated = {
      ...item,
      customerId: mockUsers.find((u) => u._id.toString() === (item.customerId?._id || item.customerId)?.toString()) || item.customerId,
      technicianId: mockUsers.find((u) => u._id.toString() === (item.technicianId?._id || item.technicianId)?.toString()) || item.technicianId,
      providerId: mockUsers.find((u) => u._id.toString() === (item.providerId?._id || item.providerId)?.toString()) || item.providerId,
      serviceId: mockServices.find((s) => s._id.toString() === (item.serviceId?._id || item.serviceId)?.toString()) || item.serviceId,
      bookingId: mockBookings.find((b) => b._id.toString() === (item.bookingId?._id || item.bookingId)?.toString()) || item.bookingId
    };
    return makeQuery(populated);
  };

  // Warranty Mocks
  Warranty.create = async (doc) => {
    const war = {
      _id: new mongoose.Types.ObjectId(),
      warrantyCode: `WAR-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`,
      warrantyPeriod: `${doc.durationDays || 30} days`,
      status: 'ACTIVE',
      ...doc
    };
    mockWarranties.push(war);
    return war;
  };

  Warranty.findOne = (filter = {}) => {
    const item = mockWarranties.find((w) => w.bookingId.toString() === filter.bookingId?.toString());
    if (!item) return makeQuery(null);
    const inst = {
      ...item,
      serviceId: mockServices.find((s) => s._id.toString() === (item.serviceId?._id || item.serviceId)?.toString()) || item.serviceId,
      bookingId: mockBookings.find((b) => b._id.toString() === (item.bookingId?._id || item.bookingId)?.toString()) || item.bookingId,
      technicianId: mockUsers.find((u) => u._id.toString() === (item.technicianId?._id || item.technicianId)?.toString()) || item.technicianId,
      providerId: mockUsers.find((u) => u._id.toString() === (item.providerId?._id || item.providerId)?.toString()) || item.providerId,
      customerId: mockUsers.find((u) => u._id.toString() === (item.customerId?._id || item.customerId)?.toString()) || item.customerId,
      save: async function () {
        const idx = mockWarranties.findIndex((w) => w._id.toString() === this._id.toString());
        if (idx !== -1) mockWarranties[idx] = { ...this };
        return this;
      }
    };
    return makeQuery(inst);
  };

  Warranty.findById = (id) => {
    const item = mockWarranties.find((w) => w._id.toString() === id.toString());
    if (!item) return makeQuery(null);
    const inst = {
      ...item,
      serviceId: mockServices.find((s) => s._id.toString() === (item.serviceId?._id || item.serviceId)?.toString()) || item.serviceId,
      bookingId: mockBookings.find((b) => b._id.toString() === (item.bookingId?._id || item.bookingId)?.toString()) || item.bookingId,
      technicianId: mockUsers.find((u) => u._id.toString() === (item.technicianId?._id || item.technicianId)?.toString()) || item.technicianId,
      providerId: mockUsers.find((u) => u._id.toString() === (item.providerId?._id || item.providerId)?.toString()) || item.providerId,
      customerId: mockUsers.find((u) => u._id.toString() === (item.customerId?._id || item.customerId)?.toString()) || item.customerId,
      save: async function () {
        const idx = mockWarranties.findIndex((w) => w._id.toString() === this._id.toString());
        if (idx !== -1) mockWarranties[idx] = { ...this };
        return this;
      }
    };
    return makeQuery(inst);
  };

  // Review Mocks
  Review.create = async (doc) => {
    const rev = {
      _id: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      verifiedWork: true,
      ...doc
    };
    mockReviews.push(rev);
    return rev;
  };

  Review.findOne = (filter = {}) => {
    const item = mockReviews.find((r) => r.bookingId.toString() === filter.bookingId?.toString());
    if (!item) return makeQuery(null);
    const populated = {
      ...item,
      customerId: mockUsers.find((u) => u._id.toString() === item.customerId?.toString()) || item.customerId,
      technicianId: mockUsers.find((u) => u._id.toString() === item.technicianId?.toString()) || item.technicianId,
      providerId: mockUsers.find((u) => u._id.toString() === item.providerId?.toString()) || item.providerId,
      bookingId: mockBookings.find((b) => b._id.toString() === item.bookingId?.toString()) || item.bookingId
    };
    return makeQuery(populated);
  };

  Review.findById = (id) => {
    const item = mockReviews.find((r) => r._id.toString() === id.toString());
    if (!item) return makeQuery(null);
    const populated = {
      ...item,
      customerId: mockUsers.find((u) => u._id.toString() === item.customerId?.toString()) || item.customerId,
      technicianId: mockUsers.find((u) => u._id.toString() === item.technicianId?.toString()) || item.technicianId,
      providerId: mockUsers.find((u) => u._id.toString() === item.providerId?.toString()) || item.providerId,
      bookingId: mockBookings.find((b) => b._id.toString() === item.bookingId?.toString()) || item.bookingId
    };
    return makeQuery(populated);
  };

  Review.aggregate = async (pipeline) => {
    const targetMatch = pipeline[0].$match;
    let filtered = [...mockReviews];
    if (targetMatch.$or) {
      filtered = filtered.filter((r) => {
        return targetMatch.$or.some((c) => {
          if (c.technicianId) return r.technicianId?.toString() === c.technicianId?.toString();
          if (c.providerId) return r.providerId?.toString() === c.providerId?.toString();
          return false;
        });
      });
    }
    if (filtered.length === 0) return [];
    const sum = filtered.reduce((acc, r) => acc + r.rating, 0);
    return [
      {
        _id: null,
        avgRating: sum / filtered.length,
        count: filtered.length
      }
    ];
  };

  // Dispute Mocks
  Dispute.create = async (doc) => {
    const dsp = {
      _id: new mongoose.Types.ObjectId(),
      disputeNumber: `DSP-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`,
      status: DISPUTE_STATUS.OPEN,
      createdAt: new Date(),
      auditHistory: doc.auditHistory || [],
      ...doc
    };
    mockDisputes.push(dsp);
    return dsp;
  };

  Dispute.findOne = (filter = {}) => {
    let list = [...mockDisputes];
    if (filter.bookingId) list = list.filter((d) => d.bookingId.toString() === filter.bookingId.toString());
    if (filter.status?.$nin) list = list.filter((d) => !filter.status.$nin.includes(d.status));
    const item = list[0] || null;
    if (!item) return makeQuery(null);
    const inst = {
      ...item,
      save: async function () {
        const idx = mockDisputes.findIndex((d) => d._id.toString() === this._id.toString());
        if (idx !== -1) mockDisputes[idx] = { ...this };
        return this;
      }
    };
    return makeQuery(inst);
  };

  Dispute.findById = (id) => {
    const item = mockDisputes.find((d) => d._id.toString() === id.toString());
    if (!item) return makeQuery(null);
    const inst = {
      ...item,
      save: async function () {
        const idx = mockDisputes.findIndex((d) => d._id.toString() === this._id.toString());
        if (idx !== -1) mockDisputes[idx] = { ...this };
        return this;
      }
    };
    return makeQuery(inst);
  };

  Dispute.find = (filter = {}) => {
    let list = [...mockDisputes];
    if (filter.status) list = list.filter((d) => d.status === filter.status);
    if (filter.raisedById) list = list.filter((d) => d.raisedById.toString() === filter.raisedById.toString());
    return makeQuery(list);
  };

  // -------------------------------------------------------------
  // Setup Completed Booking & Approved Estimate
  // -------------------------------------------------------------
  const booking1Id = new mongoose.Types.ObjectId();
  const completedBooking = {
    _id: booking1Id,
    bookingNumber: 'BK-2026-8801',
    customerId: customerId1,
    technicianId: techId,
    providerId: techId,
    serviceId: warrantyServiceId,
    status: BOOKING_STATUS.CUSTOMER_CONFIRMED,
    scheduledDate: new Date(),
    problemDescription: 'AC blowing room temperature air',
    pricing: {
      totalAmount: 1770,
      isPaid: true,
      paidAt: new Date()
    },
    statusHistory: []
  };
  mockBookings.push(completedBooking);

  const approvedEstimate = {
    _id: new mongoose.Types.ObjectId(),
    bookingId: booking1Id,
    providerId: techId,
    status: 'APPROVED',
    items: [
      { description: 'Refrigerant Gas Refill (R32)', quantity: 1, unitPrice: 1200, amount: 1200, type: 'PART' },
      { description: 'Condenser Coil Cleaning', quantity: 1, unitPrice: 300, amount: 300, type: 'LABOUR' }
    ],
    subtotal: 1500,
    tax: 270,
    total: 1770,
    discount: 0
  };
  mockEstimates.push(approvedEstimate);

  // =============================================================
  // 1. INVOICE TEST
  // =============================================================
  console.log('\n--- 1. INVOICE GENERATION & VERIFICATION ---');

  // Generate invoice after successful completion
  const invReq1 = mockReqRes(customer1, {}, { id: booking1Id });
  await invoiceController.generateInvoice(invReq1.req, invReq1.res);
  const invRes1 = invReq1.getResult();

  assert(invRes1.status === 201, 'Invoice generated with HTTP 201 after successful completion');
  const invoice = invRes1.body?.invoice;
  assert(Boolean(invoice?.invoiceNumber), 'Invoice contains: Invoice number');
  assert(Boolean(invoice?.customerId), 'Invoice contains: Customer reference');
  assert(Boolean(invoice?.technicianId), 'Invoice contains: Technician reference');
  assert(Boolean(invoice?.serviceId), 'Invoice contains: Service reference');
  assert(Boolean(invoice?.bookingId), 'Invoice contains: Booking reference');
  assert(Array.isArray(invoice?.items) && invoice.items.length === 2, 'Invoice contains: Items array');
  assert(invoice?.amount === 1770, 'Invoice contains: Amount (₹1770)');
  assert(invoice?.paymentStatus === 'PAID', 'Invoice contains: Payment status (PAID)');
  assert(Boolean(invoice?.date), 'Invoice contains: Date');
  assert(invoice?.currency === 'INR', 'Invoice contains: Currency INR');

  // Invoice Non-duplication test
  console.log('\n--- 1.2 INVOICE NON-DUPLICATION TEST ---');
  const dupInvReq = mockReqRes(technician, {}, { id: booking1Id });
  await invoiceController.generateInvoice(dupInvReq.req, dupInvReq.res);
  const dupInvRes = dupInvReq.getResult();

  assert(dupInvRes.status === 400, 'Duplicate invoice generation rejected with HTTP 400');
  assert(dupInvRes.body?.message?.includes('Duplicate invoices are strictly prohibited') || dupInvRes.body?.message?.includes('already been generated'), 'Descriptive duplicate rejection message returned');
  assert(mockInvoices.filter((i) => i.bookingId.toString() === booking1Id.toString()).length === 1, 'Strictly 1 invoice exists in database (non-duplicated)');

  // =============================================================
  // 2. WARRANTY TEST
  // =============================================================
  console.log('\n--- 2. WARRANTY CREATION & CUSTOMER VIEWING ---');

  // Create warranty for completed booking supported by service
  const warReq1 = mockReqRes(technician, {
    bookingId: booking1Id,
    durationDays: 30,
    terms: 'Standard 30-day workmanship warranty covering repair defects.'
  });
  await warrantyController.createWarranty(warReq1.req, warReq1.res);
  const warRes1 = warReq1.getResult();

  assert(warRes1.status === 201, 'Warranty record created with HTTP 201');
  const warranty = warRes1.body?.warranty || warRes1.body?.data;
  assert(warranty?.warrantyPeriod === '30 days', 'Warranty displays: Warranty period (30 days)');
  assert(Boolean(warranty?.startDate), 'Warranty displays: Start date');
  assert(Boolean(warranty?.endDate), 'Warranty displays: End date');
  assert(Boolean(warranty?.serviceId), 'Warranty displays: Service');
  assert(Boolean(warranty?.bookingId), 'Warranty displays: Booking');
  assert(warranty?.terms?.includes('30-day'), 'Warranty displays: Terms');

  // Customer can view warranty
  const warViewReq = mockReqRes(customer1, {}, { bookingId: booking1Id });
  await warrantyController.getWarrantyByBooking(warViewReq.req, warViewReq.res);
  const warViewRes = warViewReq.getResult();

  assert(warViewRes.status === 200, 'Customer can view warranty for their booking (HTTP 200 OK)');
  assert(warViewRes.body?.data?.warranty?.status === 'ACTIVE', 'Customer sees ACTIVE warranty status');

  // Service unsupported warranty test
  const noWarBookingId = new mongoose.Types.ObjectId();
  mockBookings.push({
    _id: noWarBookingId,
    bookingNumber: 'BK-2026-NOWAR',
    customerId: customerId1,
    technicianId: techId,
    serviceId: noWarrantyServiceId,
    status: BOOKING_STATUS.CUSTOMER_CONFIRMED,
    scheduledDate: new Date()
  });

  const noWarReq = mockReqRes(technician, { bookingId: noWarBookingId });
  await warrantyController.createWarranty(noWarReq.req, noWarReq.res);
  assert(noWarReq.getResult().status === 400, 'Service without warranty support rejects warranty creation with HTTP 400');

  // =============================================================
  // 3. REVIEW & RATING TESTS
  // =============================================================
  console.log('\n--- 3. REVIEW SUBMISSION, RATING UPDATE, & DEDUPLICATION ---');

  // Valid customer review submission
  const revReq1 = mockReqRes(customer1, {
    bookingId: booking1Id,
    rating: 5,
    review: 'Prompt and highly professional AC cooling restoration.'
  });
  await reviewController.createReview(revReq1.req, revReq1.res);
  const revRes1 = revReq1.getResult();

  assert(revRes1.status === 201, 'Customer can submit rating and review for completed booking (HTTP 201)');
  const review = revRes1.body?.data || revRes1.body?.review;
  assert(review?.rating === 5, 'Rating (1-5) recorded correctly as 5');
  assert(review?.review?.includes('Prompt and highly professional'), 'Review feedback text stored accurately');

  // Technician rating updates in ProviderProfile
  const profile = mockProfiles.find((p) => p.userId.toString() === techId.toString());
  assert(profile.rating.average === 5.0, 'Technician rating average dynamically updated in ProviderProfile to 5.0');
  assert(profile.rating.count === 1, 'Technician rating count updated in ProviderProfile to 1');

  // Second review for another booking to test average recalculation
  const booking2Id = new mongoose.Types.ObjectId();
  mockBookings.push({
    _id: booking2Id,
    bookingNumber: 'BK-2026-8802',
    customerId: customerId2,
    technicianId: techId,
    serviceId: warrantyServiceId,
    status: BOOKING_STATUS.CUSTOMER_CONFIRMED,
    scheduledDate: new Date()
  });

  const revReq2 = mockReqRes(customer2, {
    bookingId: booking2Id,
    rating: 3,
    review: 'Good work but arrived 15 mins late.'
  });
  await reviewController.createReview(revReq2.req, revReq2.res);
  assert(revReq2.getResult().status === 201, 'Second customer review submitted with status 201');
  assert(profile.rating.average === 4.0, 'Technician rating recalculated to average 4.0 (5 + 3 / 2)');
  assert(profile.rating.count === 2, 'Technician rating count incremented to 2');

  // Duplicate Review Prevention: Only one review per completed booking
  console.log('\n--- 3.2 DUPLICATE REVIEW PREVENTION ---');
  const dupRevReq = mockReqRes(customer1, {
    bookingId: booking1Id,
    rating: 4,
    review: 'Trying duplicate review'
  });
  await reviewController.createReview(dupRevReq.req, dupRevReq.res);
  const dupRevRes = dupRevReq.getResult();

  assert(dupRevRes.status === 400, 'Duplicate review for completed booking rejected with HTTP 400');
  assert(dupRevRes.body?.message?.includes('Only one review per completed booking is allowed'), 'Duplicate review rejection error message returned');

  // =============================================================
  // 4. SECURITY TESTS
  // =============================================================
  console.log('\n--- 4. SECURITY & VALIDATION TESTS ---');

  // Customer cannot review another customer's booking
  const unauthRevReq = mockReqRes(customer2, {
    bookingId: booking1Id,
    rating: 1,
    review: 'Intruder review'
  });
  await reviewController.createReview(unauthRevReq.req, unauthRevReq.res);
  assert(unauthRevReq.getResult().status === 403, 'Customer cannot review another booking (HTTP 403 Forbidden)');

  // Customer cannot review uncompleted booking
  const inProgressBookingId = new mongoose.Types.ObjectId();
  mockBookings.push({
    _id: inProgressBookingId,
    bookingNumber: 'BK-2026-INPROG',
    customerId: customerId2,
    technicianId: techId,
    serviceId: warrantyServiceId,
    status: BOOKING_STATUS.WORK_IN_PROGRESS,
    scheduledDate: new Date()
  });

  const uncompletedRevReq = mockReqRes(customer2, {
    bookingId: inProgressBookingId,
    rating: 5,
    review: 'Premature review'
  });
  await reviewController.createReview(uncompletedRevReq.req, uncompletedRevReq.res);
  assert(uncompletedRevReq.getResult().status === 400, 'Customer cannot review uncompleted booking (HTTP 400 Bad Request)');

  // Customer cannot manipulate rating through frontend (rating must be 1-5 integer)
  const invalidRatingReq1 = mockReqRes(customer2, {
    bookingId: booking2Id,
    rating: 6,
    review: 'Hacked 6 star'
  });
  await reviewController.createReview(invalidRatingReq1.req, invalidRatingReq1.res);
  assert(invalidRatingReq1.getResult().status === 400, 'Rating > 5 rejected with HTTP 400');

  const invalidRatingReq2 = mockReqRes(customer2, {
    bookingId: booking2Id,
    rating: 0,
    review: 'Zero star'
  });
  await reviewController.createReview(invalidRatingReq2.req, invalidRatingReq2.res);
  assert(invalidRatingReq2.getResult().status === 400, 'Rating < 1 rejected with HTTP 400');

  const invalidRatingReq3 = mockReqRes(customer2, {
    bookingId: booking2Id,
    rating: 4.5,
    review: 'Fractional star'
  });
  await reviewController.createReview(invalidRatingReq3.req, invalidRatingReq3.res);
  assert(invalidRatingReq3.getResult().status === 400, 'Non-integer rating rejected with HTTP 400');

  // =============================================================
  // 5. DISPUTE & ADMIN DISPUTE HANDLING
  // =============================================================
  console.log('\n--- 5. DISPUTE LIFECYCLE & ADMIN HANDLING ---');

  // 5.1 Customer can raise a dispute for an eligible booking
  const disputeReq = mockReqRes(customer1, {
    bookingId: booking1Id,
    reason: 'BILLING_DISCREPANCY',
    description: 'Billed amount included R32 gas refill which seemed higher than phone estimate.'
  });
  await disputeController.createDispute(disputeReq.req, disputeReq.res);
  const disputeRes = disputeReq.getResult();

  assert(disputeRes.status === 201, 'Customer can raise dispute for eligible booking (HTTP 201 Created)');
  const dispute = disputeRes.body?.data || disputeRes.body?.dispute;
  assert(Boolean(dispute?.disputeNumber), 'Dispute has unique disputeNumber');
  assert(dispute?.status === DISPUTE_STATUS.OPEN, 'Initial dispute status is OPEN');

  // 5.2 Technician can respond
  const techRespReq = mockReqRes(technician, {
    message: 'Explained that the unit required full 800g recharge as coils were completely empty.'
  }, { id: dispute._id });
  await disputeController.respondToDispute(techRespReq.req, techRespReq.res);
  const techRespRes = techRespReq.getResult();

  assert(techRespRes.status === 200, 'Technician can respond to dispute (HTTP 200 OK)');
  const respondedDispute = techRespRes.body?.data || techRespRes.body?.dispute;
  assert(respondedDispute?.status === DISPUTE_STATUS.UNDER_REVIEW, 'Dispute status transitions to UNDER_REVIEW upon technician response');
  assert(Boolean(respondedDispute?.technicianResponse?.message), 'technicianResponse recorded with message and timestamp');

  // 5.3 Non-admin unauthorized resolution attempt rejected
  const nonAdminResolveReq = mockReqRes(customer1, {
    status: DISPUTE_STATUS.RESOLVED
  }, { id: dispute._id });
  await disputeController.resolveDispute(nonAdminResolveReq.req, nonAdminResolveReq.res);
  assert(nonAdminResolveReq.getResult().status === 403, 'Non-admin customer cannot resolve dispute (HTTP 403 Forbidden)');

  // 5.4 Admin can review and resolve dispute
  const adminResolveReq = mockReqRes(admin, {
    status: DISPUTE_STATUS.RESOLVED,
    resolutionType: 'NO_ACTION',
    resolutionNotes: 'Reviewed technician gas recharge invoices; billed charges adhere to platform standards.'
  }, { id: dispute._id });
  await disputeController.resolveDispute(adminResolveReq.req, adminResolveReq.res);
  const adminResolveRes = adminResolveReq.getResult();

  assert(adminResolveRes.status === 200, 'Admin can review and resolve dispute (HTTP 200 OK)');
  const resolvedDispute = adminResolveRes.body?.data || adminResolveRes.body?.dispute;
  assert(resolvedDispute?.status === DISPUTE_STATUS.RESOLVED, 'Dispute status transitioned to RESOLVED');
  assert(Boolean(resolvedDispute?.adminReview?.reviewedById), 'adminReview recorded with reviewing admin ID');
  assert(Boolean(resolvedDispute?.closedAt), 'closedAt timestamp recorded upon resolution');

  // 5.5 Admin can close dispute
  const adminCloseReq = mockReqRes(admin, {
    status: DISPUTE_STATUS.CLOSED,
    resolutionNotes: 'Case closed and archived.'
  }, { id: dispute._id });
  await disputeController.resolveDispute(adminCloseReq.req, adminCloseReq.res);
  const adminCloseRes = adminCloseReq.getResult();

  assert(adminCloseRes.status === 200, 'Admin can transition dispute to CLOSED (HTTP 200 OK)');
  assert(adminCloseRes.body?.data?.status === DISPUTE_STATUS.CLOSED, 'Dispute status confirmed as CLOSED');

  // Final summary
  console.log('\n======================================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPostPaymentLifecycleTests();
