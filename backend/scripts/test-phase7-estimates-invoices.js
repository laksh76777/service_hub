/**
 * Phase 7: Estimates, Customer Approval, Additional Work & Invoices Test Suite
 *
 * Verifies:
 * 1. Provider creates initial estimate (PENDING_CUSTOMER).
 * 2. Provider approval attempt blocked with 403 (Only customer can approve).
 * 3. Client total manipulation attempt detected and auto-corrected / enforced by backend.
 * 4. Customer approves estimate (APPROVED).
 * 5. Provider creates additional work estimate on site (isAdditionalWork: true).
 * 6. Customer rejects an estimate with rejection reason (REJECTED).
 * 7. Customer approves valid additional work estimate (APPROVED).
 * 8. Final invoice compilation from all approved estimate items only.
 * 9. Accurate subtotal, 18% GST tax calculation, and total balance.
 * 10. Duplicate invoice prevention (second invoice generation blocked).
 * 11. PDF invoice generation stream check (valid %PDF- header).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/database');
const User = require('../src/models/User');
const Booking = require('../src/models/Booking');
const Service = require('../src/models/Service');
const Estimate = require('../src/models/Estimate');
const Invoice = require('../src/models/Invoice');
const estimateController = require('../src/controllers/estimateController');
const invoiceController = require('../src/controllers/invoiceController');
const { ESTIMATE_STATUS, INVOICE_STATUS, USER_ROLES } = require('../src/utils/constants');

/**
 * Mock Request & Response Helper
 */
const createMockReqRes = (user, body = {}, params = {}, query = {}) => {
  let statusCode = 200;
  let responseData = null;
  const headers = {};
  const chunks = [];

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    setHeader(name, value) {
      headers[name] = value;
      return this;
    },
    write(chunk) {
      chunks.push(chunk);
      return true;
    },
    end(chunk) {
      if (chunk) chunks.push(chunk);
      return this;
    },
    on() {
      return this;
    },
    once() {
      return this;
    },
    emit() {
      return true;
    }
  };

  const req = {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    body,
    params,
    query
  };

  return {
    req,
    res,
    getStatus: () => statusCode,
    getData: () => responseData,
    getHeaders: () => headers,
    getChunks: () => chunks
  };
};

async function runPhase7Tests() {
  console.log('============================================================');
  console.log('STARTING PHASE 7: ESTIMATES, INVOICES & PDF GENERATION SUITE');
  console.log('============================================================\n');

  try {
    await connectDB();

    // 1. Setup Test Users
    const customerUser = await User.findOneAndUpdate(
      { email: 'laksh@gmail.com' },
      {
        name: 'Laksh Suthar',
        firebaseUid: 'demo-customer-phase7-uid',
        email: 'laksh@gmail.com',
        role: USER_ROLES.CUSTOMER,
        status: 'ACTIVE'
      },
      { upsert: true, new: true }
    );

    const providerUser = await User.findOneAndUpdate(
      { email: 'ac.tech@servicehub.demo' },
      {
        name: 'Rahul Sharma',
        firebaseUid: 'demo-provider-phase7-uid',
        email: 'ac.tech@servicehub.demo',
        role: USER_ROLES.PROVIDER,
        status: 'ACTIVE'
      },
      { upsert: true, new: true }
    );

    let testService = await Service.findOne();
    if (!testService) {
      throw new Error('No service found in database.');
    }

    // 2. Create Fresh Booking
    const booking = await Booking.create({
      bookingNumber: `BK-${Date.now().toString().slice(-4)}-7721`,
      customerId: customerUser._id,
      providerId: providerUser._id,
      serviceId: testService._id,
      address: {
        addressLine1: '42, 2nd Cross, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038'
      },
      scheduledDate: new Date(Date.now() + 86400000),
      problemDescription: 'Split AC deep service and cooling check',
      status: 'IN_PROGRESS'
    });

    const bookingId = booking._id.toString();
    console.log(`Created test booking ${booking.bookingNumber} (${bookingId}).\n`);

    // =========================================================================
    // TEST 1: Provider Creates Initial Job Estimate & Server Recalculation
    // =========================================================================
    console.log('[TEST 1] Testing Initial Job Estimate Creation & Server-side Pricing...');

    // Notice client attempts to send falsified total of ₹10 instead of true calculated total
    const estimatePayload = {
      items: [
        { description: 'Split AC Jet Foam Servicing', quantity: 1, unitPrice: 599, type: 'SERVICE' },
        { description: 'High Pressure Drain Line Flush', quantity: 1, unitPrice: 199, type: 'LABOUR' }
      ],
      notes: 'Standard seasonal servicing with outdoor condenser foam wash.',
      // Intentionally forged subtotal/tax/total to test tamper protection:
      subtotal: 10,
      taxes: 1,
      total: 11
    };

    const t1 = createMockReqRes(providerUser, estimatePayload, { id: bookingId });
    await estimateController.createEstimate(t1.req, t1.res);

    if (t1.getStatus() !== 201) {
      throw new Error(`Failed to create initial estimate: ${JSON.stringify(t1.getData())}`);
    }

    const initialEstimate = t1.getData().estimate;
    const initialEstimateId = initialEstimate._id.toString();

    // Expected: Subtotal = 599 + 199 = 798. Tax (18%) = 143.64. Total = 941.64
    if (initialEstimate.subtotal !== 798 || initialEstimate.taxes !== 143.64 || initialEstimate.total !== 941.64) {
      throw new Error(`Tamper prevention failed! Got total: ${initialEstimate.total}`);
    }

    console.log(`  -> PASS: Estimate ${initialEstimate.estimateNumber} created in status '${initialEstimate.status}'.`);
    console.log(`  -> PASS: Tamper protection verified! Server enforced Subtotal: ₹${initialEstimate.subtotal}, 18% GST: ₹${initialEstimate.taxes}, Total: ₹${initialEstimate.total}.`);

    // =========================================================================
    // TEST 2: Provider Unauthorized Approval Attempt Block
    // =========================================================================
    console.log('\n[TEST 2] Testing Provider Unauthorized Approval Block (Must be rejected)...');
    const t2 = createMockReqRes(providerUser, {}, { id: initialEstimateId });
    await estimateController.approveEstimate(t2.req, t2.res);

    if (t2.getStatus() === 403) {
      console.log(`  -> PASS: Provider approval strictly rejected with 403: "${t2.getData().message}"`);
    } else {
      throw new Error(`Expected 403 Forbidden for provider approval, got ${t2.getStatus()}`);
    }

    // =========================================================================
    // TEST 3: Customer Approves Initial Estimate
    // =========================================================================
    console.log('\n[TEST 3] Testing Customer Approval of Estimate...');
    const t3 = createMockReqRes(customerUser, {}, { id: initialEstimateId });
    await estimateController.approveEstimate(t3.req, t3.res);

    if (t3.getStatus() !== 200 || t3.getData().estimate.status !== ESTIMATE_STATUS.APPROVED) {
      throw new Error(`Customer approval failed: ${JSON.stringify(t3.getData())}`);
    }
    console.log(`  -> PASS: Estimate approved by customer! Status is now '${t3.getData().estimate.status}'.`);

    // =========================================================================
    // TEST 4: On-Site Additional Work Estimate & Rejection Flow
    // =========================================================================
    console.log('\n[TEST 4] Testing Additional Work Estimate Creation & Customer Rejection...');
    const extraWorkPayload = {
      isAdditionalWork: true,
      items: [
        { description: 'Premium Antibacterial Air Filter Replacement', quantity: 2, unitPrice: 350, type: 'PART' }
      ],
      notes: 'Customer asked for optional replacement filter.'
    };

    const t4a = createMockReqRes(providerUser, extraWorkPayload, { id: bookingId });
    await estimateController.createEstimate(t4a.req, t4a.res);
    if (t4a.getStatus() !== 201) {
      throw new Error(`Failed to create additional work estimate: ${JSON.stringify(t4a.getData())}`);
    }
    const rejectedEstimateId = t4a.getData().estimate._id.toString();
    console.log(`  -> PASS: Additional work estimate created: ${t4a.getData().estimate.estimateNumber}`);

    // Customer rejects this optional extra estimate with reason
    const t4b = createMockReqRes(
      customerUser,
      { reason: 'Current filter is clean enough for now; will replace next season.' },
      { id: rejectedEstimateId }
    );
    await estimateController.rejectEstimate(t4b.req, t4b.res);

    if (t4b.getStatus() !== 200 || t4b.getData().estimate.status !== ESTIMATE_STATUS.REJECTED) {
      throw new Error(`Estimate rejection failed: ${JSON.stringify(t4b.getData())}`);
    }
    console.log(`  -> PASS: Customer successfully rejected extra estimate. Reason recorded: "${t4b.getData().estimate.rejectionReason}"`);

    // =========================================================================
    // TEST 5: Necessary Additional Work Approved by Customer
    // =========================================================================
    console.log('\n[TEST 5] Testing Essential Additional Work Approved by Customer...');
    const necessaryGasWork = {
      isAdditionalWork: true,
      items: [
        { description: 'R32 Refrigerant Gas Leak Repair & Top-up', quantity: 1, unitPrice: 850, type: 'PART' },
        { description: 'Copper Flare Nut Replacement', quantity: 2, unitPrice: 75, type: 'PART' }
      ],
      notes: 'Detected micro-leak at outdoor unit; flare nut damaged.'
    };

    const t5a = createMockReqRes(providerUser, necessaryGasWork, { id: bookingId });
    await estimateController.createEstimate(t5a.req, t5a.res);
    const approvedExtraEstId = t5a.getData().estimate._id.toString();

    // Customer approves this essential additional work
    const t5b = createMockReqRes(customerUser, {}, { id: approvedExtraEstId });
    await estimateController.approveEstimate(t5b.req, t5b.res);
    if (t5b.getStatus() !== 200 || t5b.getData().estimate.status !== ESTIMATE_STATUS.APPROVED) {
      throw new Error('Failed to approve essential additional work.');
    }
    console.log(`  -> PASS: Additional work estimate approved! Total: ₹${t5b.getData().estimate.total}.`);

    // =========================================================================
    // TEST 6: Final Invoice Generation & Accurate Calculation
    // =========================================================================
    console.log('\n[TEST 6] Testing Final Invoice Generation & Accurate Line-Item Compilation...');
    const t6 = createMockReqRes(providerUser, {}, { id: bookingId });
    await invoiceController.generateInvoice(t6.req, t6.res);

    if (t6.getStatus() !== 201) {
      throw new Error(`Failed to generate invoice: ${JSON.stringify(t6.getData())}`);
    }

    const invoice = t6.getData().invoice;
    const invoiceId = invoice._id.toString();

    // Initial Est subtotal: 798. Extra Est subtotal: 850 + 150 = 1000. Total subtotal = 1798.
    // Tax (18%): 1798 * 0.18 = 323.64.
    // Total: 1798 + 323.64 = 2121.64.
    if (invoice.subtotal !== 1798) {
      throw new Error(`Expected invoice subtotal 1798, got ${invoice.subtotal}`);
    }
    if (invoice.tax !== 323.64) {
      throw new Error(`Expected invoice 18% GST 323.64, got ${invoice.tax}`);
    }
    if (invoice.total !== 2121.64) {
      throw new Error(`Expected invoice total 2121.64, got ${invoice.total}`);
    }

    // Verify rejected filter ($700) was NOT included
    const hasRejectedPart = invoice.items.some((it) => it.description.includes('Antibacterial Air Filter'));
    if (hasRejectedPart) {
      throw new Error('Security Breach: Rejected estimate item was included in final invoice!');
    }

    console.log(`  -> PASS: Invoice ${invoice.invoiceNumber} successfully compiled.`);
    console.log(`  -> PASS: Total billed items: ${invoice.items.length} items (from approved initial + additional work).`);
    console.log(`  -> PASS: Verified: Rejected estimates are strictly excluded.`);
    console.log(`  -> PASS: Subtotal: ₹${invoice.subtotal}, 18% GST: ₹${invoice.tax}, Total: ₹${invoice.total}.`);

    // =========================================================================
    // TEST 7: Duplicate Invoice Prevention
    // =========================================================================
    console.log('\n[TEST 7] Testing Duplicate Invoice Prevention...');
    const t7 = createMockReqRes(providerUser, {}, { id: bookingId });
    await invoiceController.generateInvoice(t7.req, t7.res);

    if (t7.getStatus() === 400) {
      console.log(`  -> PASS: Duplicate invoice creation strictly prevented: "${t7.getData().message}"`);
    } else {
      throw new Error(`Expected 400 for duplicate invoice, got ${t7.getStatus()}`);
    }

    // =========================================================================
    // TEST 8: Professional PDF Invoice Stream Verification
    // =========================================================================
    console.log('\n[TEST 8] Testing PDF Invoice Stream Generation...');
    const t8 = createMockReqRes(customerUser, {}, { id: invoiceId });
    await invoiceController.downloadInvoicePdf(t8.req, t8.res);

    const pdfHeaders = t8.getHeaders();
    if (pdfHeaders['Content-Type'] !== 'application/pdf') {
      throw new Error(`Expected Content-Type application/pdf, got ${pdfHeaders['Content-Type']}`);
    }

    const pdfBuffer = Buffer.concat(t8.getChunks());
    const isPdfValid = pdfBuffer.toString('utf8', 0, 5) === '%PDF-';
    if (!isPdfValid) {
      throw new Error('PDF output does not start with valid %PDF- header magic bytes!');
    }
    console.log(`  -> PASS: Generated PDF invoice successfully (Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB, Header: %PDF-).`);

    console.log('\n============================================================');
    console.log('ALL PHASE 7 ESTIMATES & INVOICES TESTS PASSED WITH 100%!');
    console.log('============================================================');
  } catch (err) {
    console.error('\n❌ PHASE 7 TEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

runPhase7Tests();
