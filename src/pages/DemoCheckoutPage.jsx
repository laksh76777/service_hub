import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createPaymentOrder, completePayment, getBookingById } from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

const DemoCheckoutPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  
  // Payment outcome simulation state
  const [paymentResult, setPaymentResult] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState('UPI');
  const [failureReasonChoice, setFailureReasonChoice] = useState('Card declined by issuing bank');

  useEffect(() => {
    const initOrder = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch booking details
        const bRes = await getBookingById(bookingId);
        const bData = bRes.data?.booking || bRes.booking;
        setBooking(bData);

        // Create or get authoritative payment order
        const orderRes = await createPaymentOrder(bookingId);
        setOrder(orderRes.data);
      } catch (err) {
        setError(err.message || 'Unable to initialize checkout.');
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) {
      initOrder();
    }
  }, [bookingId]);

  const handleSimulatePayment = async (outcome) => {
    if (!order?.paymentId) return;

    setProcessing(true);
    setError('');

    try {
      const payload = {
        paymentId: order.paymentId,
        outcome
      };

      if (outcome === 'FAILED') {
        payload.failureReason = failureReasonChoice;
      }

      const res = await completePayment(payload);
      setPaymentResult(res.data);

      if (outcome === 'CANCELLED') {
        setTimeout(() => {
          navigate(`/bookings/${bookingId}`);
        }, 1500);
      }
    } catch (err) {
      setError(err.message || 'Payment processing error.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
          Initializing secure checkout session...
        </p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <Card className="p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Cannot Proceed to Checkout
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {error}
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(`/bookings/${bookingId}`)}
            >
              Back to Booking Details
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Demo Gateway Header & Banner */}
      <div className="mb-6 p-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center space-y-1">
        <h1 className="text-2xl font-extrabold text-amber-950 dark:text-amber-100">
          ServiceHub Demo Payment
        </h1>
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          Demo Mode — No real money will be charged.
        </p>
      </div>

      {paymentResult?.success ? (
        /* Success State */
        <Card className="p-8 text-center space-y-6 animate-fade-in border-emerald-500/30">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
            ✓
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
              Payment Completed Successfully!
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {paymentResult.alreadyPaid
                ? 'This booking was already marked as paid. No duplicate charge was made.'
                : 'Your invoice has been settled in full and the booking is now marked as Completed.'}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 max-w-md mx-auto text-left text-xs space-y-2 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between">
              <span className="text-gray-500">Amount Paid:</span>
              <span className="font-bold text-gray-900 dark:text-white">
                ₹{paymentResult.payment?.amount?.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Transaction ID:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {paymentResult.payment?.transactionId || 'DEMO_TXN_VERIFIED'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Gateway:</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {paymentResult.payment?.gateway || 'DEMO'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Booking Number:</span>
              <span className="font-mono text-gray-700 dark:text-gray-300">
                {order?.bookingNumber || booking?.bookingNumber}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <Button
              variant="primary"
              onClick={() => navigate(`/bookings/${bookingId}`)}
            >
              Return to Booking Details
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/bookings')}
            >
              View All Bookings
            </Button>
          </div>
        </Card>
      ) : (
        /* Checkout Interactive Form */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Left Column: Order Summary */}
          <div className="md:col-span-2 space-y-4">
            <Card className="p-5">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                Order Summary
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-gray-500 block text-[11px]">Service</span>
                  <span className="font-bold text-gray-900 dark:text-white text-sm">
                    {order?.serviceName || booking?.serviceId?.name || 'Home Service'}
                  </span>
                </div>

                <div>
                  <span className="text-gray-500 block text-[11px]">Technician</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {order?.technicianName || booking?.technicianId?.name || booking?.providerId?.name || 'Assigned Technician'}
                  </span>
                </div>

                <div>
                  <span className="text-gray-500 block text-[11px]">Booking</span>
                  <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
                    {order?.bookingNumber || booking?.bookingNumber || booking?._id}
                  </span>
                </div>

                {order?.invoiceNumber && (
                  <div>
                    <span className="text-gray-500 block text-[11px]">Invoice</span>
                    <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
                      {order.invoiceNumber}
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-gray-500 block text-[11px]">Currency</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {order?.currency || 'INR'}
                  </span>
                </div>

                <div>
                  <span className="text-gray-500 block text-[11px]">Gateway Order ID</span>
                  <span className="font-mono text-[11px] text-gray-600 dark:text-gray-400 break-all">
                    {order?.orderId}
                  </span>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-baseline">
                  <span className="font-bold text-gray-700 dark:text-gray-300">
                    Amount
                  </span>
                  <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
                    ₹{order?.amount?.toLocaleString('en-IN')} {order?.currency || 'INR'}
                  </span>
                </div>
              </div>
            </Card>

            <div className="text-[11px] text-gray-400 text-center space-y-1">
              <p>🔒 256-Bit SSL Demo Gateway Encryption</p>
              <p>Authoritative server-side verified calculation.</p>
            </div>
          </div>

          {/* Right Column: Simulated Gateway Interface */}
          <div className="md:col-span-3 space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  Simulated Payment Options
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  DEMO GATEWAY
                </span>
              </div>

              {/* Payment Method Selector */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                {['UPI', 'Card', 'NetBanking'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setSelectedMethod(method)}
                    className={`py-2 px-3 rounded-lg border text-center font-medium transition-all ${
                      selectedMethod === method
                        ? 'border-blue-600 bg-blue-50/50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {method === 'UPI' && '📱 UPI'}
                    {method === 'Card' && '💳 Card'}
                    {method === 'NetBanking' && '🏦 NetBanking'}
                  </button>
                ))}
              </div>

              {/* Failure Alert Banner if previously failed */}
              {paymentResult?.status === 'FAILED' && (
                <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
                  <span>✕</span>
                  <div>
                    <strong>Payment Simulation Failed:</strong> {paymentResult.message || 'Transaction was declined.'}
                    <p className="mt-0.5 text-[11px] text-rose-600 dark:text-rose-300">
                      You can retry payment with a successful outcome below.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200">
                  {error}
                </div>
              )}

              {/* Simulation Controls */}
              <div className="mt-6 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Test / Simulate Gateway Outcomes:
                </p>

                {/* Pay Successfully Button */}
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  loading={processing}
                  onClick={() => handleSimulatePayment('SUCCESS')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
                >
                  Pay Successfully
                </Button>

                {/* Simulate Failed Payment */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex flex-col sm:flex-row gap-2 items-center">
                    <select
                      value={failureReasonChoice}
                      onChange={(e) => setFailureReasonChoice(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                    >
                      <option value="Demo payment declined">Demo payment declined</option>
                      <option value="Card declined by issuing bank">Card declined by issuing bank</option>
                      <option value="Insufficient funds in account">Insufficient funds in account</option>
                      <option value="Bank server timeout">Bank server timeout</option>
                      <option value="Invalid OTP entered">Invalid OTP entered</option>
                    </select>

                    <Button
                      variant="outline"
                      size="sm"
                      loading={processing}
                      onClick={() => handleSimulatePayment('FAILED')}
                      className="w-full sm:w-auto whitespace-nowrap text-rose-600 border-rose-300 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-800 dark:hover:bg-rose-950/40"
                    >
                      Simulate Failed Payment
                    </Button>
                  </div>
                </div>

                {/* Cancel Payment */}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    fullWidth
                    size="sm"
                    disabled={processing}
                    onClick={() => handleSimulatePayment('CANCELLED')}
                    className="text-gray-600 hover:text-gray-900 border-gray-300 dark:text-gray-400 dark:border-gray-700 font-medium"
                  >
                    Cancel Payment
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoCheckoutPage;
