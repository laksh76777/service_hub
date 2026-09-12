const crypto = require('crypto');
const PaymentProvider = require('./PaymentProvider');
const { PAYMENT_GATEWAY } = require('../../utils/constants');

/**
 * DemoPaymentProvider
 *
 * Implements realistic payment order creation and simulation without real money,
 * external API keys, or third-party dependencies.
 */
class DemoPaymentProvider extends PaymentProvider {
  constructor() {
    super();
    this.name = PAYMENT_GATEWAY.DEMO;
  }

  /**
   * Creates a demo gateway order
   */
  async createOrder({ amount, currency = 'INR', receipt = '', notes = {} }) {
    const timestamp = Date.now().toString().slice(-4);
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const orderId = `DEMO_ORDER_${timestamp}_${randomHex}`;

    return {
      orderId,
      amount: Math.round(Number(amount) * 100) / 100,
      currency: (currency || 'INR').toUpperCase(),
      gateway: this.name,
      receipt,
      notes,
      createdAt: new Date()
    };
  }

  /**
   * Verifies / executes the demo payment simulation
   */
  async verifyPayment({ orderId, simulateOutcome = 'SUCCESS', reason = '' }) {
    const outcome = (simulateOutcome || 'SUCCESS').toUpperCase();

    if (outcome === 'FAILED') {
      return {
        success: false,
        status: 'FAILED',
        reason: reason || 'Demo payment declined by customer simulation',
        gateway: this.name
      };
    }

    if (outcome === 'CANCELLED') {
      return {
        success: false,
        status: 'CANCELLED',
        reason: reason || 'Demo payment cancelled by customer',
        gateway: this.name
      };
    }

    // Success simulation
    const timestamp = Date.now().toString().slice(-4);
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const transactionId = `DEMO_TXN_${timestamp}_${randomHex}`;
    const gatewayPaymentId = `DEMO_PAY_${timestamp}_${randomHex}`;

    return {
      success: true,
      status: 'SUCCESS',
      transactionId,
      gatewayPaymentId,
      orderId,
      gateway: this.name,
      paidAt: new Date()
    };
  }

  /**
   * Simulates payment refund
   */
  async refundPayment({ paymentId, amount, reason = '' }) {
    const timestamp = Date.now().toString().slice(-4);
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();

    return {
      success: true,
      refundId: `DEMO_REFUND_${timestamp}_${randomHex}`,
      paymentId,
      amount,
      reason: reason || 'Customer requested demo refund',
      refundedAt: new Date()
    };
  }
}

module.exports = DemoPaymentProvider;
