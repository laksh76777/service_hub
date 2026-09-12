const config = require('../../config/environment');
const Payment = require('../../models/Payment');
const Booking = require('../../models/Booking');
const Invoice = require('../../models/Invoice');
const Estimate = require('../../models/Estimate');
const DemoPaymentProvider = require('./DemoPaymentProvider');
const notificationService = require('../notificationService');
const { PAYMENT_STATUS, PAYMENT_GATEWAY, BOOKING_STATUS, INVOICE_STATUS, ESTIMATE_STATUS, USER_ROLES, NOTIFICATION_TYPE } = require('../../utils/constants');

class PaymentService {
  constructor() {
    // Select active provider based on environment variable
    const mode = (config.paymentMode || 'demo').toLowerCase();
    if (mode === 'demo') {
      this.provider = new DemoPaymentProvider();
    } else {
      // Prepared for future providers (e.g. RazorpayPaymentProvider)
      this.provider = new DemoPaymentProvider();
    }
  }

  /**
   * Returns current active gateway provider name
   */
  getGatewayName() {
    return this.provider.name;
  }

  /**
   * Creates a payment gateway order with authoritative server-side pricing
   * Never trusts client-submitted amount
   */
  async createPaymentOrder(bookingIdOrParams, maybeUser) {
    let bookingId;
    let customerId;

    if (typeof bookingIdOrParams === 'object' && bookingIdOrParams !== null && !bookingIdOrParams._bsontype) {
      bookingId = bookingIdOrParams.bookingId;
      customerId = bookingIdOrParams.customerId || bookingIdOrParams.user?._id;
    } else {
      bookingId = bookingIdOrParams;
      customerId = maybeUser?._id || maybeUser;
    }

    const booking = await Booking.findById(bookingId)
      .populate('serviceId', 'name basePrice')
      .populate('technicianId', 'name email phone')
      .populate('providerId', 'name email phone');

    if (!booking) {
      const err = new Error('Booking not found.');
      err.status = 404;
      throw err;
    }

    const requestingRole = maybeUser?.role;
    if (requestingRole === USER_ROLES.TECHNICIAN || requestingRole === 'PROVIDER') {
      const err = new Error('Access denied: Technicians cannot create payment orders.');
      err.status = 403;
      throw err;
    }

    const bookingCustId = (booking.customerId?._id || booking.customerId)?.toString();
    if (!customerId || bookingCustId !== customerId.toString()) {
      const err = new Error('Access denied: You are not authorized to make payments for this booking.');
      err.status = 403;
      throw err;
    }

    // Check if booking is already successfully paid
    const existingSuccessPayment = await Payment.findOne({
      bookingId: booking._id,
      status: PAYMENT_STATUS.SUCCESS
    });

    if (existingSuccessPayment) {
      const err = new Error('This booking has already been paid successfully.');
      err.status = 400;
      throw err;
    }

    // Disallow payment if booking is not in a payable state (e.g. estimate rejected or pending)
    const payableStatuses = [
      BOOKING_STATUS.PAYMENT_PENDING,
      BOOKING_STATUS.ESTIMATE_APPROVED,
      BOOKING_STATUS.CUSTOMER_CONFIRMED,
      BOOKING_STATUS.WORK_COMPLETED,
      BOOKING_STATUS.INVOICED
    ];

    if (!payableStatuses.includes(booking.status)) {
      const err = new Error(`Payment cannot be initiated for booking in '${booking.status}' status. An estimate must be approved first.`);
      err.status = 400;
      throw err;
    }

    // Calculate trusted payable amount from server-side data
    let payableAmount = 0;
    let associatedInvoice = await Invoice.findOne({
      bookingId: booking._id,
      status: { $ne: INVOICE_STATUS.CANCELLED }
    });

    if (associatedInvoice) {
      payableAmount = Math.max(0, associatedInvoice.remainingAmount || associatedInvoice.total);
    } else {
      // If invoice not yet generated, check for approved estimates
      const approvedEstimates = await Estimate.find({
        bookingId: booking._id,
        status: ESTIMATE_STATUS.APPROVED
      });

      if (approvedEstimates.length > 0) {
        payableAmount = approvedEstimates.reduce((sum, est) => sum + est.total, 0);
      } else {
        // Fallback only to confirmed booking pricing finalTotal
        payableAmount = booking.pricing?.finalTotal || 0;
      }
    }

    if (payableAmount <= 0) {
      const err = new Error('No payable amount found for this booking.');
      err.status = 400;
      throw err;
    }

    payableAmount = Math.round(payableAmount * 100) / 100;

    // Create order with the active gateway provider
    const orderData = await this.provider.createOrder({
      amount: payableAmount,
      currency: 'INR',
      receipt: `RCPT_${booking.bookingNumber || booking._id}`,
      notes: {
        bookingId: booking._id.toString(),
        customerId: customerId.toString()
      }
    });

    const technicianId = booking.technicianId?._id || booking.technicianId || booking.providerId?._id || booking.providerId;

    // Save or update pending payment record in DB
    let payment = await Payment.findOne({
      bookingId: booking._id,
      status: { $in: [PAYMENT_STATUS.CREATED, PAYMENT_STATUS.PENDING] }
    });

    if (payment) {
      payment.amount = payableAmount;
      payment.currency = 'INR';
      payment.gateway = orderData.gateway;
      payment.gatewayOrderId = orderData.orderId;
      payment.status = PAYMENT_STATUS.PENDING;
      payment.technicianId = technicianId;
      payment.providerId = technicianId;
      payment.invoiceId = associatedInvoice?._id || payment.invoiceId;
      await payment.save();
    } else {
      payment = await Payment.create({
        bookingId: booking._id,
        customerId: booking.customerId,
        technicianId,
        providerId: technicianId,
        invoiceId: associatedInvoice?._id,
        amount: payableAmount,
        currency: 'INR',
        gateway: orderData.gateway,
        gatewayOrderId: orderData.orderId,
        status: PAYMENT_STATUS.PENDING
      });
    }

    return {
      paymentId: payment._id,
      orderId: orderData.orderId,
      gatewayOrderId: orderData.orderId,
      amount: payableAmount,
      currency: 'INR',
      gateway: orderData.gateway,
      bookingNumber: booking.bookingNumber,
      serviceName: booking.serviceId?.name || 'Home Service',
      technicianName: booking.technicianId?.name || booking.providerId?.name || 'Assigned Technician',
      invoiceNumber: associatedInvoice?.invoiceNumber || null
    };
  }

  /**
   * Completes / simulates demo payment execution
   * Implements authoritative duplicate payment protection & state transitions
   */
  async completePayment(params) {
    const { paymentId, outcome, failureReason } = params;
    const simulateOutcome = params.simulateOutcome || outcome || 'SUCCESS';
    const customerId = params.customerId || params.user?._id;
    const userRole = params.user?.role;

    // Strict RBAC: Technicians cannot modify or execute payment statuses
    if (userRole === USER_ROLES.TECHNICIAN || userRole === 'PROVIDER') {
      const err = new Error('Access denied: Technicians are not permitted to modify or complete payments.');
      err.status = 403;
      throw err;
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      const err = new Error('Payment record not found.');
      err.status = 404;
      throw err;
    }

    const isAdmin = userRole === USER_ROLES.ADMIN;
    const paymentCustId = (payment.customerId?._id || payment.customerId)?.toString();
    if (!isAdmin && customerId && paymentCustId !== customerId.toString()) {
      const err = new Error('Access denied: You are not authorized to modify this payment.');
      err.status = 403;
      throw err;
    }

    const booking = await Booking.findById(payment.bookingId);
    if (!booking) {
      const err = new Error('Associated booking not found.');
      err.status = 404;
      throw err;
    }

    const bookingCustId = (booking.customerId?._id || booking.customerId)?.toString();
    if (!isAdmin && customerId && bookingCustId !== customerId.toString()) {
      const err = new Error('Access denied: You do not own the booking for this payment.');
      err.status = 403;
      throw err;
    }

    // Amount verification: Must be positive valid amount
    if (!payment.amount || payment.amount <= 0) {
      const err = new Error('Invalid payment amount.');
      err.status = 400;
      throw err;
    }

    // DUPLICATE PAYMENT PROTECTION:
    // If this payment is already SUCCESS, return idempotently without duplicate side effects
    if (payment.status === PAYMENT_STATUS.SUCCESS) {
      return {
        success: true,
        alreadyPaid: true,
        message: 'Payment has already been completed successfully.',
        payment
      };
    }

    if (payment.status === PAYMENT_STATUS.REFUNDED) {
      const err = new Error('Cannot process payment: This transaction was refunded.');
      err.status = 400;
      throw err;
    }

    // Prevent duplicate successful payments across any other payment record for this booking
    const existingSuccessPayment = await Payment.findOne({
      bookingId: payment.bookingId,
      status: PAYMENT_STATUS.SUCCESS,
      _id: { $ne: payment._id }
    });

    if (existingSuccessPayment) {
      const err = new Error('This booking has already been paid successfully.');
      err.status = 400;
      throw err;
    }

    // Verify / execute with provider
    const verification = await this.provider.verifyPayment({
      orderId: payment.gatewayOrderId,
      simulateOutcome,
      reason: failureReason
    });

    if (verification.status === PAYMENT_STATUS.SUCCESS) {
      payment.status = PAYMENT_STATUS.SUCCESS;
      payment.transactionId = verification.transactionId;
      payment.gatewayPaymentId = verification.gatewayPaymentId;
      payment.paymentReference = verification.transactionId;
      payment.paidAt = verification.paidAt || new Date();
      payment.failureReason = null;
      await payment.save();

      // Update associated invoice to PAID
      let invoice = null;
      if (payment.invoiceId) {
        invoice = await Invoice.findById(payment.invoiceId);
      } else {
        invoice = await Invoice.findOne({
          bookingId: booking._id,
          status: { $ne: INVOICE_STATUS.CANCELLED }
        });
      }

      if (invoice) {
        invoice.status = INVOICE_STATUS.PAID;
        invoice.paidAmount = payment.amount;
        invoice.amountPaid = payment.amount;
        invoice.remainingAmount = 0;
        invoice.paidAt = payment.paidAt;
        await invoice.save();
        if (!payment.invoiceId) {
          payment.invoiceId = invoice._id;
          await payment.save();
        }
      }

      // Update booking pricing & state
      booking.pricing = booking.pricing || {};
      booking.pricing.paidAmount = payment.amount;
      booking.pricing.finalTotal = payment.amount;
      booking.pricing.isPaid = true;
      booking.pricing.paidAt = payment.paidAt;
      booking.paymentStatus = 'PAID';

      // State progression:
      // If booking was awaiting payment: next state is PAYMENT_SUCCESS
      // If booking was in post-work confirmation: next state is INVOICED
      const terminalStatuses = [
        BOOKING_STATUS.COMPLETED,
        BOOKING_STATUS.INVOICED,
        BOOKING_STATUS.CANCELLED,
        BOOKING_STATUS.CANCELLED_BY_CUSTOMER,
        BOOKING_STATUS.CANCELLED_BY_PROVIDER,
        BOOKING_STATUS.REJECTED,
        BOOKING_STATUS.DISPUTED
      ];

      if (!terminalStatuses.includes(booking.status)) {
        let nextStatus = BOOKING_STATUS.PAYMENT_SUCCESS;
        if ([BOOKING_STATUS.WORK_COMPLETED, BOOKING_STATUS.CUSTOMER_CONFIRMED].includes(booking.status)) {
          nextStatus = BOOKING_STATUS.INVOICED;
        }

        const previousStatus = booking.status;
        booking.status = nextStatus;
        booking.statusHistory = booking.statusHistory || [];
        booking.statusHistory.push({
          previousStatus,
          newStatus: nextStatus,
          actor: {
            userId: customerId,
            role: userRole || USER_ROLES.CUSTOMER
          },
          reason: 'Payment completed successfully. Booking marked as ' + nextStatus + '.',
          timestamp: new Date()
        });
      }

      await booking.save();

      // Notify customer & provider
      await Promise.all([
        notificationService.notify({
          recipientId: payment.customerId,
          senderId: payment.providerId,
          bookingId: payment.bookingId,
          type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,
          title: 'Payment Successful',
          message: `Your payment of ₹${payment.amount} was completed successfully (Txn: ${payment.transactionId}).`,
          data: { paymentId: payment._id, bookingId: payment.bookingId }
        }),
        notificationService.notify({
          recipientId: payment.providerId,
          senderId: payment.customerId,
          bookingId: payment.bookingId,
          type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,
          title: 'Payment Successful',
          message: `Customer payment of ₹${payment.amount} received for booking ${booking?.bookingNumber || payment.bookingId}.`,
          data: { paymentId: payment._id, bookingId: payment.bookingId }
        })
      ]);

      return {
        success: true,
        status: PAYMENT_STATUS.SUCCESS,
        message: 'Payment completed successfully.',
        payment
      };
    } else if (verification.status === PAYMENT_STATUS.FAILED) {
      payment.status = PAYMENT_STATUS.FAILED;
      payment.failureReason = failureReason || verification.reason || 'Demo payment declined';
      await payment.save();

      // Booking remains payable! Booking status is not modified to terminal.

      // Notify customer of failed payment
      await notificationService.notify({
        recipientId: payment.customerId,
        senderId: payment.providerId,
        bookingId: payment.bookingId,
        type: NOTIFICATION_TYPE.PAYMENT_FAILED,
        title: 'Payment Failed',
        message: `Payment attempt of ₹${payment.amount} failed: ${payment.failureReason}.`,
        data: { paymentId: payment._id, bookingId: payment.bookingId }
      });

      return {
        success: false,
        status: PAYMENT_STATUS.FAILED,
        message: payment.failureReason,
        payment
      };
    } else if (verification.status === PAYMENT_STATUS.CANCELLED) {
      payment.status = PAYMENT_STATUS.CANCELLED;
      payment.failureReason = verification.reason || 'Demo payment cancelled';
      await payment.save();

      // Booking remains valid for later payment.

      return {
        success: false,
        status: PAYMENT_STATUS.CANCELLED,
        message: payment.failureReason,
        payment
      };
    }

    throw new Error('Unknown payment verification status');
  }

  /**
   * Retrieves payment history for a booking or authenticated user
   */
  async getPaymentHistory(bookingIdOrParams, maybeUser) {
    let bookingId;
    let user;

    if (typeof bookingIdOrParams === 'object' && bookingIdOrParams !== null && !bookingIdOrParams._bsontype) {
      bookingId = bookingIdOrParams.bookingId;
      user = bookingIdOrParams.user || { _id: bookingIdOrParams.userId, role: bookingIdOrParams.role };
    } else {
      bookingId = bookingIdOrParams;
      user = maybeUser;
    }

    const filter = {};
    if (bookingId) {
      filter.bookingId = bookingId;
    } else if (user) {
      if (user.role === USER_ROLES.CUSTOMER) {
        filter.customerId = user._id;
      } else if (user.role === USER_ROLES.TECHNICIAN || user.role === USER_ROLES.PROVIDER || user.role === 'PROVIDER') {
        filter.providerId = user._id;
      }
    }

    return Payment.find(filter)
      .populate('bookingId', 'bookingNumber scheduledDate address status problemDescription')
      .populate('customerId', 'name fullName email phoneNumber')
      .populate('providerId', 'name fullName email phoneNumber')
      .populate('invoiceId', 'invoiceNumber total status')
      .sort({ createdAt: -1 });
  }

  /**
   * Get single payment details with ownership check
   */
  async getPaymentById(paymentId, user) {
    const payment = await Payment.findById(paymentId)
      .populate('bookingId')
      .populate('customerId', 'name fullName email phoneNumber')
      .populate('providerId', 'name fullName email phoneNumber')
      .populate('invoiceId');

    if (!payment) {
      const err = new Error('Payment record not found.');
      err.status = 404;
      throw err;
    }

    const isCustomer = payment.customerId?._id?.toString() === user._id.toString();
    const isProvider = payment.providerId?._id?.toString() === user._id.toString();
    const isAdmin = user.role === USER_ROLES.ADMIN;

    if (!isCustomer && !isProvider && !isAdmin) {
      const err = new Error('Access denied: You do not have permission to view this payment.');
      err.status = 403;
      throw err;
    }

    return payment;
  }
}

// Export singleton instance
module.exports = new PaymentService();
