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
      .populate('providerId', 'name email phone');

    if (!booking) {
      const err = new Error('Booking not found.');
      err.status = 404;
      throw err;
    }

    if (!customerId || booking.customerId.toString() !== customerId.toString()) {
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
        // Fallback to booking pricing
        payableAmount = booking.pricing?.finalTotal || booking.pricing?.estimatedTotal || 0;
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

    // Save or update pending payment record in DB
    let payment = await Payment.findOne({
      bookingId: booking._id,
      status: { $in: [PAYMENT_STATUS.CREATED, PAYMENT_STATUS.PENDING] }
    });

    if (payment) {
      payment.amount = payableAmount;
      payment.gateway = orderData.gateway;
      payment.gatewayOrderId = orderData.orderId;
      payment.status = PAYMENT_STATUS.PENDING;
      payment.invoiceId = associatedInvoice?._id || payment.invoiceId;
      await payment.save();
    } else {
      payment = await Payment.create({
        bookingId: booking._id,
        customerId: booking.customerId,
        providerId: booking.providerId?._id || booking.providerId,
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

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      const err = new Error('Payment record not found.');
      err.status = 404;
      throw err;
    }

    if (customerId && payment.customerId.toString() !== customerId.toString()) {
      const err = new Error('Access denied: You are not authorized to modify this payment.');
      err.status = 403;
      throw err;
    }

    // DUPLICATE PAYMENT PROTECTION:
    // If payment is already SUCCESS, return idempotently without duplicate side effects
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

    // Verify / execute with provider
    const verification = await this.provider.verifyPayment({
      orderId: payment.gatewayOrderId,
      simulateOutcome
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
      if (payment.invoiceId) {
        const invoice = await Invoice.findById(payment.invoiceId);
        if (invoice) {
          invoice.status = INVOICE_STATUS.PAID;
          invoice.paidAmount = payment.amount;
          invoice.amountPaid = payment.amount;
          invoice.remainingAmount = 0;
          invoice.paidAt = payment.paidAt;
          await invoice.save();
        }
      }

      // Update booking pricing & state
      const booking = await Booking.findById(payment.bookingId);
      if (booking) {
        booking.pricing = booking.pricing || {};
        booking.pricing.paidAmount = payment.amount;
        booking.pricing.finalTotal = payment.amount;
        booking.pricing.isPaid = true;
        booking.pricing.paidAt = payment.paidAt;

        // Advance booking status to COMPLETED if not already terminal
        const terminalStatuses = [
          BOOKING_STATUS.COMPLETED,
          BOOKING_STATUS.CANCELLED_BY_CUSTOMER,
          BOOKING_STATUS.CANCELLED_BY_PROVIDER,
          BOOKING_STATUS.DISPUTED
        ];

        if (!terminalStatuses.includes(booking.status)) {
          const previousStatus = booking.status;
          booking.status = BOOKING_STATUS.COMPLETED;
          booking.statusHistory = booking.statusHistory || [];
          booking.statusHistory.push({
            previousStatus,
            newStatus: BOOKING_STATUS.COMPLETED,
            actor: {
              userId: customerId,
              role: USER_ROLES.CUSTOMER
            },
            reason: 'Payment completed successfully. Booking marked as COMPLETED.',
            timestamp: new Date()
          });
        }

        await booking.save();
      }

      // Notify customer & provider
      await Promise.all([
        notificationService.notify({
          recipientId: payment.customerId,
          senderId: payment.providerId,
          type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,
          title: 'Payment Successful',
          message: `Your payment of ₹${payment.amount} was completed successfully (Txn: ${payment.transactionId}).`,
          data: { paymentId: payment._id, bookingId: payment.bookingId }
        }),
        notificationService.notify({
          recipientId: payment.providerId,
          senderId: payment.customerId,
          type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,
          title: 'Payment Received',
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
      payment.failureReason = failureReason || verification.reason || 'Payment processing failed';
      await payment.save();

      // Notify customer of failed payment
      await notificationService.notify({
        recipientId: payment.customerId,
        senderId: payment.providerId,
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
      payment.failureReason = verification.reason || 'Payment cancelled by user';
      await payment.save();

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
      } else if (user.role === USER_ROLES.PROVIDER) {
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
