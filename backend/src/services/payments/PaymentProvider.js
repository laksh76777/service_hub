/**
 * Base PaymentProvider Interface
 *
 * Defines the contract that all payment gateway providers (Demo, future Razorpay, etc.)
 * must implement. This ensures the rest of the application remains completely decoupled
 * from specific payment gateway APIs.
 */
class PaymentProvider {
  /**
   * Creates an order with the payment gateway
   *
   * @param {Object} params
   * @param {number} params.amount - Amount in currency units (e.g. INR)
   * @param {string} params.currency - 3-letter currency code (e.g. INR)
   * @param {string} params.receipt - Internal receipt / booking reference
   * @param {Object} [params.notes] - Additional metadata
   * @returns {Promise<{ orderId: string, amount: number, currency: string, gateway: string }>}
   */
  async createOrder(params) {
    throw new Error('Method createOrder() must be implemented by payment provider subclass');
  }

  /**
   * Verifies payment execution outcome
   *
   * @param {Object} params
   * @param {string} params.orderId
   * @param {string} [params.simulateOutcome] - For testing/demo ('SUCCESS' | 'FAILED' | 'CANCELLED')
   * @returns {Promise<{ success: boolean, status: string, transactionId?: string, gatewayPaymentId?: string, reason?: string, paidAt?: Date }>}
   */
  async verifyPayment(params) {
    throw new Error('Method verifyPayment() must be implemented by payment provider subclass');
  }

  /**
   * Issues a refund
   */
  async refundPayment(params) {
    throw new Error('Method refundPayment() must be implemented by payment provider subclass');
  }
}

module.exports = PaymentProvider;
