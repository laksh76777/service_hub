import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createPaymentOrder, completePayment, getBookingById } from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';

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
  const [failureReasonChoice, setFailureReasonChoice] = useState('Simulated authorization failure');

  useEffect(() => {
    const initOrder = async () => {
      try {
        setLoading(true);
        setError('');

        const bRes = await getBookingById(bookingId);
        const bData = bRes.data?.booking || bRes.booking;
        setBooking(bData);

        const orderRes = await createPaymentOrder(bookingId);
        setOrder(orderRes.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Unable to initialize checkout.');
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
        }, 1200);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Payment processing error.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <Loading fullPage text="Preparing checkout session..." />;
  }

  if (error && !order) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4">
        <Card className="p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold shadow-2xs">
            !
          </div>
          <h2 className="text-xl font-black text-slate-900">
            Cannot Proceed to Checkout
          </h2>
          <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
            {error}
          </p>
          <div className="pt-3 flex justify-center">
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

  const serviceTitle = order?.serviceName || booking?.serviceId?.name || 'Home Service';
  const technicianTitle = order?.technicianName || booking?.technicianId?.name || booking?.providerId?.name || 'Assigned Technician';
  const totalAmount = order?.amount || booking?.pricing?.finalTotal || booking?.pricing?.estimatedTotal || 0;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 space-y-6">
      
      {/* Requirement 27 Banner: "Demo Payment — No real money will be charged." */}
      <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200 text-center space-y-1 shadow-2xs">
        <h1 className="text-xl sm:text-2xl font-black text-amber-950">
          ServiceHub Demo Checkout
        </h1>
        <p className="text-xs font-semibold text-amber-800">
          Demo Payment — No real money will be charged.
        </p>
      </div>

      {paymentResult?.success ? (
        /* Polished Success Screen (Requirement 27) */
        <Card className="p-8 text-center space-y-6 border-emerald-300 bg-white">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto text-3xl font-bold shadow-2xs">
            ✓
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Payment Completed Successfully
            </h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Your service estimate of <span className="font-bold text-slate-900">₹{totalAmount.toLocaleString('en-IN')}</span> has been settled. The technician has been notified to proceed.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 max-w-md mx-auto text-left text-xs space-y-2 border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Service:</span>
              <span className="font-bold text-slate-800">{serviceTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Technician:</span>
              <span className="font-semibold text-slate-800">{technicianTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Amount Settled:</span>
              <span className="font-black text-slate-900">₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Payment ID:</span>
              <span className="font-mono text-blue-600">{paymentResult.payment?.paymentId || order?.paymentId || 'DEMO_PAY_VERIFIED'}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate(`/bookings/${bookingId}`)}
            >
              Return to Booking Details →
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/dashboard')}
            >
              My Dashboard
            </Button>
          </div>
        </Card>
      ) : (
        /* Requirement 27: Service, Technician, Estimate, Amount */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          
          {/* Order Summary Panel (2 Cols) */}
          <div className="md:col-span-2 space-y-4">
            <Card title="Payment Summary">
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Service</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {serviceTitle}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Technician</span>
                  <span className="font-semibold text-slate-800">
                    {technicianTitle}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Booking Number</span>
                  <span className="font-mono font-semibold text-slate-700">
                    {order?.bookingNumber || booking?.bookingNumber}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                  <span className="font-bold text-slate-700">Total Amount:</span>
                  <span className="text-xl font-black text-blue-600">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </Card>

            <div className="text-[11px] text-slate-400 text-center space-y-0.5">
              <p>🔒 Simulated Demo Payment Interface</p>
              <p>Tested securely without real payment gateways.</p>
            </div>
          </div>

          {/* Simulation Controls Panel (3 Cols) */}
          <div className="md:col-span-3 space-y-4">
            <Card title="Simulated Payment Methods">
              <div className="space-y-4">
                {/* Method selector */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {['UPI', 'Card', 'NetBanking'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMethod(m)}
                      className={`py-2.5 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        selectedMethod === m
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {m === 'UPI' && '📱 UPI'}
                      {m === 'Card' && '💳 Card'}
                      {m === 'NetBanking' && '🏦 NetBanking'}
                    </button>
                  ))}
                </div>

                {paymentResult?.status === 'FAILED' && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1" role="alert">
                    <strong>Payment Failed:</strong> {paymentResult.message || 'Simulated transaction declined.'}
                    <p className="text-[11px] text-rose-600">You can retry with a successful outcome below.</p>
                  </div>
                )}

                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800" role="alert">
                    {error}
                  </div>
                )}

                {/* Outcome Simulation Buttons */}
                <div className="pt-2 space-y-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Select Simulation Outcome:
                  </span>

                  {/* Success State */}
                  <Button
                    variant="primary"
                    fullWidth
                    size="lg"
                    disabled={processing}
                    onClick={() => handleSimulatePayment('SUCCESS')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 shadow-md shadow-emerald-600/20"
                  >
                    {processing ? 'Processing...' : `Pay ₹${totalAmount.toLocaleString('en-IN')} (Success)`}
                  </Button>

                  {/* Failed State */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                      <select
                        value={failureReasonChoice}
                        onChange={(e) => setFailureReasonChoice(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                      >
                        <option value="Card declined by issuing bank">Card declined by issuing bank</option>
                        <option value="Insufficient funds in account">Insufficient funds in account</option>
                        <option value="Bank server timeout">Bank server timeout</option>
                      </select>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={processing}
                        onClick={() => handleSimulatePayment('FAILED')}
                        className="w-full sm:w-auto text-rose-600 border-rose-200 hover:bg-rose-50 whitespace-nowrap"
                      >
                        Simulate Failure
                      </Button>
                    </div>
                  </div>

                  {/* Cancelled State */}
                  <div className="pt-1">
                    <Button
                      variant="ghost"
                      fullWidth
                      size="sm"
                      disabled={processing}
                      onClick={() => handleSimulatePayment('CANCELLED')}
                    >
                      Cancel &amp; Return
                    </Button>
                  </div>
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
