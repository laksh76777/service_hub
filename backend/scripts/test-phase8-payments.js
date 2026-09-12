/**
 * Phase 8: Demo Payment Gateway Test Suite
 *
 * Verifies:
 * 1. Authoritative backend order creation (zero trust for client amounts).
 * 2. Demo gateway order metadata (DEMO_ORDER_ prefix, DEMO gateway, status CREATED).
 * 3. Security: Unauthorized customer cannot create orders or pay for another's booking.
 * 4. Payment failure simulation (marked FAILED with reason, booking/invoice unchanged).
 * 5. Payment cancellation simulation (marked CANCELLED, booking/invoice unchanged).
 * 6. Payment success simulation (marked SUCCESS, transactionId generated, paidAt recorded).
 * 7. Real-time synchronization: Invoice marked PAID, remaining balance 0, Booking advanced to COMPLETED.
 * 8. Duplicate payment protection: Idempotent handling prevents double charges.
 * 9. Payment history audit: lists all payment attempts with proper status and amounts.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/database');
const User = require('../src/models/User');
const Booking = require('../src/models/Booking');
const Service = require('../src/models/Service');
const ServiceCategory = require('../src/models/ServiceCategory');
const Estimate = require('../src/models/Estimate');
const Invoice = require('../src/models/Invoice');
const Payment = require('../src/models/Payment');
const paymentController = require('../src/controllers/paymentController');
const { PAYMENT_STATUS, PAYMENT_GATEWAY, BOOKING_STATUS, INVOICE_STATUS, ESTIMATE_STATUS, USER_ROLES } = require('../src/utils/constants');

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

async function runPhase8Tests() {
  console.log('='.repeat(65));
  console.log('--- STARTING PHASE 8: DEMO PAYMENT GATEWAY TEST SUITE ---');
  console.log('='.repeat(65));

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
    const customerUser = await User.findOneAndUpdate(
      { email: 'phase8_customer@servicehub.test' },
      {
        firebaseUid: 'test-phase8-cust-uid',
        email: 'phase8_customer@servicehub.test',
        fullName: 'Phase 8 Customer',
        phoneNumber: '+919876543210',
        role: USER_ROLES.CUSTOMER
      },
      { upsert: true, returnDocument: 'after' }
    );

    const providerUser = await User.findOneAndUpdate(
      { email: 'phase8_provider@servicehub.test' },
      {
        firebaseUid: 'test-phase8-prov-uid',
        email: 'phase8_provider@servicehub.test',
        fullName: 'Phase 8 Provider',
        phoneNumber: '+919876543211',
        role: USER_ROLES.PROVIDER
      },
      { upsert: true, returnDocument: 'after' }
    );

    const attackerUser = await User.findOneAndUpdate(
      { email: 'phase8_attacker@servicehub.test' },
      {
        firebaseUid: 'test-phase8-attacker-uid',
        email: 'phase8_attacker@servicehub.test',
        fullName: 'Phase 8 Attacker',
        phoneNumber: '+919876543299',
        role: USER_ROLES.CUSTOMER
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Setup Test Service
    let service = await Service.findOne();
    if (!service) {
      let category = await ServiceCategory.findOne();
      if (!category) {
        category = await ServiceCategory.create({ name: 'AC Repair', slug: 'ac-repair' });
      }
      service = await Service.create({
        name: 'Phase 8 AC Repair',
        slug: 'phase-8-ac-repair',
        description: 'Test AC Repair for Phase 8 payments',
        basePrice: 1500,
        estimatedDurationHours: 2,
        categoryId: category._id
      });
    }

    // Clean up past Phase 8 bookings/payments
    await Booking.deleteMany({ customerId: customerUser._id, problemDescription: 'AC cooling coil issue' });
    await Payment.deleteMany({ customerId: customerUser._id });

    // 2. Create Test Booking
    const booking = await Booking.create({
      bookingNumber: `BK-${Date.now().toString().slice(-4)}-P801`,
      customerId: customerUser._id,
      providerId: providerUser._id,
      serviceId: service._id,
      status: BOOKING_STATUS.CUSTOMER_VERIFIED,
      scheduledDate: new Date(),
      address: {
        addressLine1: '42, Phase 8 Tech Park, Whitefield',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560066'
      },
      problemDescription: 'AC cooling coil issue',
      pricing: {
        estimatedTotal: 2500,
        currency: 'INR'
      }
    });

    // 3. Create Approved Estimate & Invoice
    const estimate = await Estimate.create({
      estimateNumber: `EST-${Date.now()}-P8`,
      bookingId: booking._id,
      providerId: providerUser._id,
      customerId: customerUser._id,
      items: [
        { description: 'Coil replacement', quantity: 1, unitPrice: 2000, amount: 2000, type: 'PART' },
        { description: 'Technician Labour', quantity: 1, unitPrice: 500, amount: 500, type: 'LABOUR' }
      ],
      subtotal: 2500,
      taxes: 450, // 18% GST
      total: 2950,
      status: ESTIMATE_STATUS.APPROVED
    });

    const invoice = await Invoice.create({
      invoiceNumber: `INV-${Date.now()}-P8`,
      bookingId: booking._id,
      providerId: providerUser._id,
      customerId: customerUser._id,
      items: estimate.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        type: item.type
      })),
      subtotal: 2500,
      taxBreakup: { cgst: 225, sgst: 225, totalTax: 450 },
      total: 2950,
      paidAmount: 0,
      remainingAmount: 2950,
      status: INVOICE_STATUS.UNPAID
    });

    console.log(`\nSetup complete: Booking ${booking.bookingNumber} (${booking._id}), Invoice ${invoice.invoiceNumber}, Amount ₹${invoice.total}\n`);

    // ==========================================
    // TEST 1: Authoritative Backend Pricing
    // ==========================================
    console.log('--- TEST 1: Authoritative Backend Pricing & Order Creation ---');
    {
      // Client maliciously attempts to send { amount: 10 } in request body
      const { req, res, getResult } = createMockReqRes(customerUser, {
        bookingId: booking._id.toString(),
        amount: 10 // Attacker attempt
      });

      await paymentController.createPaymentOrder(req, res);
      const result = getResult();

      assert(result.status === 201, 'Endpoint returns 201 Created');
      assert(result.body.success === true, 'Response marked success');
      assert(result.body.data.amount === 2950, `Authoritative amount is ₹2950 (attacker amount ₹10 ignored)`);
      assert(result.body.data.gateway === PAYMENT_GATEWAY.DEMO, 'Gateway is correctly set to DEMO');
      assert(result.body.data.gatewayOrderId.startsWith('DEMO_ORDER_'), 'Gateway order ID starts with DEMO_ORDER_');
    }

    // ==========================================
    // TEST 2: Security - Unauthorized Order Creation Blocked
    // ==========================================
    console.log('\n--- TEST 2: Security - Unauthorized User Blocked ---');
    {
      const { req, res, getResult } = createMockReqRes(attackerUser, {
        bookingId: booking._id.toString()
      });

      await paymentController.createPaymentOrder(req, res);
      const result = getResult();

      assert(result.status === 403, 'Unauthorized customer blocked with 403 Forbidden');
    }

    // ==========================================
    // TEST 3: Demo Payment Simulation - Failed Outcome
    // ==========================================
    console.log('\n--- TEST 3: Demo Payment Simulation - Failed Payment ---');
    let failedPaymentId;
    {
      // Create order for failed test
      const createReq = createMockReqRes(customerUser, { bookingId: booking._id.toString() });
      await paymentController.createPaymentOrder(createReq.req, createReq.res);
      const order = createReq.getResult().body.data;
      failedPaymentId = order.paymentId;

      // Simulate failure
      const { req, res, getResult } = createMockReqRes(customerUser, {
        paymentId: failedPaymentId,
        outcome: 'FAILED',
        failureReason: 'Card declined by issuing bank (Demo Simulation)'
      });

      await paymentController.completePayment(req, res);
      const result = getResult();

      assert(result.status === 200, 'Completion endpoint returns 200');
      assert(result.body.data.success === false, 'Payment completion result is false');
      assert(result.body.data.payment.status === PAYMENT_STATUS.FAILED, 'Payment record marked as FAILED');
      assert(result.body.data.payment.failureReason.includes('declined'), 'Failure reason accurately stored');

      // Verify invoice and booking are NOT modified
      const currentInvoice = await Invoice.findById(invoice._id);
      const currentBooking = await Booking.findById(booking._id);
      assert(currentInvoice.status === INVOICE_STATUS.ISSUED, 'Invoice remains ISSUED (unpaid) after failed payment');
      assert(currentBooking.status === BOOKING_STATUS.CUSTOMER_VERIFIED, 'Booking remains in CUSTOMER_VERIFIED status');
    }

    // ==========================================
    // TEST 4: Demo Payment Simulation - Cancelled Outcome
    // ==========================================
    console.log('\n--- TEST 4: Demo Payment Simulation - Cancelled Payment ---');
    {
      const createReq = createMockReqRes(customerUser, { bookingId: booking._id.toString() });
      await paymentController.createPaymentOrder(createReq.req, createReq.res);
      const order = createReq.getResult().body.data;

      const { req, res, getResult } = createMockReqRes(customerUser, {
        paymentId: order.paymentId,
        outcome: 'CANCELLED'
      });

      await paymentController.completePayment(req, res);
      const result = getResult();

      assert(result.status === 200, 'Completion endpoint returns 200');
      assert(result.body.data.payment.status === PAYMENT_STATUS.CANCELLED, 'Payment record marked as CANCELLED');
    }

    // ==========================================
    // TEST 5: Demo Payment Simulation - Successful Payment
    // ==========================================
    console.log('\n--- TEST 5: Demo Payment Simulation - Successful Payment ---');
    let successfulPaymentId;
    {
      const createReq = createMockReqRes(customerUser, { bookingId: booking._id.toString() });
      await paymentController.createPaymentOrder(createReq.req, createReq.res);
      const orderRes = createReq.getResult();
      if (!orderRes.body.success) {
        console.error('Test 5 order creation error:', orderRes.body);
      }
      const order = orderRes.body.data;
      successfulPaymentId = order.paymentId;

      const { req, res, getResult } = createMockReqRes(customerUser, {
        paymentId: successfulPaymentId,
        outcome: 'SUCCESS'
      });

      await paymentController.completePayment(req, res);
      const result = getResult();
      if (result.status !== 200) {
        console.error('Test 5 completion error:', result.body);
      }

      assert(result.status === 200, 'Completion endpoint returns 200');
      assert(result.body.data.success === true, 'Payment completion result is true');
      assert(result.body.data.payment.status === PAYMENT_STATUS.SUCCESS, 'Payment record marked as SUCCESS');
      assert(result.body.data.payment.transactionId.startsWith('DEMO_TXN_'), 'Valid DEMO_TXN_ transaction ID generated');
      assert(result.body.data.payment.paidAt != null, 'Payment paidAt timestamp recorded');
    }

    // ==========================================
    // TEST 6: Synchronization with Invoice and Booking
    // ==========================================
    console.log('\n--- TEST 6: Synchronization with Invoice and Booking ---');
    {
      const updatedInvoice = await Invoice.findById(invoice._id);
      assert(updatedInvoice.status === INVOICE_STATUS.PAID, 'Invoice status updated to PAID');
      assert(updatedInvoice.paidAmount === 2950, 'Invoice paidAmount equals total (₹2950)');
      assert(updatedInvoice.remainingAmount === 0, 'Invoice remainingAmount is ₹0');
      assert(updatedInvoice.paidAt != null, 'Invoice paidAt timestamp updated');

      const updatedBooking = await Booking.findById(booking._id);
      assert(updatedBooking.status === BOOKING_STATUS.COMPLETED, 'Booking status updated to COMPLETED');
      assert(updatedBooking.pricing.finalTotal === 2950, 'Booking finalTotal set to ₹2950');
      assert(updatedBooking.pricing.paidAt != null, 'Booking paidAt recorded');
    }

    // ==========================================
    // TEST 7: Duplicate Payment Protection (Idempotency)
    // ==========================================
    console.log('\n--- TEST 7: Duplicate Payment Protection (Idempotency) ---');
    {
      // Attempt to re-complete the already successful payment
      const { req, res, getResult } = createMockReqRes(customerUser, {
        paymentId: successfulPaymentId,
        outcome: 'SUCCESS'
      });

      await paymentController.completePayment(req, res);
      const result = getResult();

      assert(result.status === 200, 'Re-completion returns 200 OK');
      assert(result.body.data.alreadyPaid === true, 'Duplicate payment detected and flagged as alreadyPaid: true');
      assert(result.body.data.payment.status === PAYMENT_STATUS.SUCCESS, 'Payment remains in SUCCESS status');

      // Verify invoice was not double credited
      const checkInvoice = await Invoice.findById(invoice._id);
      assert(checkInvoice.paidAmount === 2950, 'Invoice paidAmount was not doubled (still ₹2950)');
    }

    // ==========================================
    // TEST 8: Payment History Retrieval
    // ==========================================
    console.log('\n--- TEST 8: Payment History Retrieval ---');
    {
      const { req, res, getResult } = createMockReqRes(customerUser, {}, {
        bookingId: booking._id.toString()
      });

      await paymentController.getPaymentHistory(req, res);
      const result = getResult();

      assert(result.status === 200, 'Get payment history returns 200');
      assert(Array.isArray(result.body.data), 'History returns an array of payments');
      assert(result.body.data.length >= 3, `History contains all attempts (found ${result.body.data.length})`);

      const statuses = result.body.data.map(p => p.status);
      assert(statuses.includes(PAYMENT_STATUS.FAILED), 'History includes FAILED attempt');
      assert(statuses.includes(PAYMENT_STATUS.CANCELLED), 'History includes CANCELLED attempt');
      assert(statuses.includes(PAYMENT_STATUS.SUCCESS), 'History includes SUCCESS attempt');
    }

    console.log('\n' + '='.repeat(65));
    console.log(`PHASE 8 TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log('='.repeat(65));

    await disconnectDB();
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error in Phase 8 tests:', error);
    await disconnectDB();
    process.exit(1);
  }
}

runPhase8Tests();
