const PaymentService = require('../services/payments/PaymentService');

const createPaymentOrder = async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required to create a payment order.'
      });
    }

    const orderData = await PaymentService.createPaymentOrder(bookingId, req.user);
    return res.status(201).json({
      success: true,
      message: 'Payment order created successfully.',
      data: orderData
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error creating payment order.'
    });
  }
};

const completePayment = async (req, res) => {
  try {
    const { paymentId, outcome, failureReason } = req.body;
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required.'
      });
    }

    const result = await PaymentService.completePayment({
      paymentId,
      user: req.user,
      outcome: outcome || 'SUCCESS',
      failureReason
    });

    return res.status(200).json({
      success: true,
      message: 'Payment processed successfully.',
      data: result
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error processing payment.'
    });
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const history = await PaymentService.getPaymentHistory(bookingId, req.user);
    return res.status(200).json({
      success: true,
      message: 'Payment history retrieved successfully.',
      data: history
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error retrieving payment history.'
    });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await PaymentService.getPaymentById(paymentId, req.user);
    return res.status(200).json({
      success: true,
      message: 'Payment retrieved successfully.',
      data: payment
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error retrieving payment.'
    });
  }
};

module.exports = {
  createPaymentOrder,
  completePayment,
  getPaymentHistory,
  getPaymentById
};
