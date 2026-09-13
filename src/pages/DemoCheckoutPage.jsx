import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createPaymentOrder, completePayment, getBookingById } from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';

const POPULAR_BANKS = [
  { id: 'HDFC', name: 'HDFC Bank', icon: '🏦' },
  { id: 'SBI', name: 'State Bank of India', icon: '🏛️' },
  { id: 'ICICI', name: 'ICICI Bank', icon: '🏢' },
  { id: 'AXIS', name: 'Axis Bank', icon: '🏬' },
  { id: 'KOTAK', name: 'Kotak Mahindra', icon: '🏛️' }
];

const DemoCheckoutPage = () => {
  const { id, bookingId: paramBookingId } = useParams();
  const activeBookingId = id || paramBookingId;
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingStepText, setProcessingStepText] = useState('');
  const [error, setError] = useState('');

  // Tab & Method State
  const [activeTab, setActiveTab] = useState('upi'); // 'upi', 'card', 'netbanking', 'wallet'
  const [selectedUpiApp, setSelectedUpiApp] = useState('gpay');
  const [vpaInput, setVpaInput] = useState('customer@okhdfcbank');
  const [cardNumber, setCardNumber] = useState('4532 8901 2345 6789');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('888');
  const [cardHolder, setCardHolder] = useState('Valued Customer');
  const [selectedBank, setSelectedBank] = useState('HDFC');

  // Simulation Controls State
  const [simulatedOutcome, setSimulatedOutcome] = useState('SUCCESS'); // 'SUCCESS' or 'FAILED'
  const [failureReasonChoice, setFailureReasonChoice] = useState('Simulated card decline / authorization failed');
  const [paymentResult, setPaymentResult] = useState(null);

  useEffect(() => {
    const initOrder = async () => {
      try {
        setLoading(true);
        setError('');

        const bRes = await getBookingById(activeBookingId);
        const bData = bRes.data?.booking || bRes.booking;
        setBooking(bData);

        if (bData.customer?.name) {
          setCardHolder(bData.customer.name);
          const safeName = bData.customer.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          setVpaInput(`${safeName || 'user'}@okaxis`);
        }

        // If booking is already paid, display confirmation directly
        if (bData.status === 'PAYMENT_SUCCESS' || bData.pricing?.isPaid) {
          setPaymentResult({
            success: true,
            alreadyPaid: true,
            message: 'Payment has already been completed successfully.',
            payment: {
              paymentReference: bData.paymentReference || 'DEMO-TXN-PAID',
              transactionId: bData.paymentReference || 'DEMO-TXN-PAID',
              provider: 'DEMO-RAZORPAY',
              amount: bData.pricing?.finalTotal || bData.pricing?.paidAmount || 0,
              paidAt: bData.pricing?.paidAt || new Date()
            }
          });
          return;
        }

        const orderRes = await createPaymentOrder(activeBookingId);
        setOrder(orderRes.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Unable to initialize demo payment session.');
      } finally {
        setLoading(false);
      }
    };

    if (activeBookingId) {
      initOrder();
    }
  }, [activeBookingId]);

  const handleSimulatePayment = async (overrideOutcome = null) => {
    if (!order?.paymentId && !activeBookingId) return;

    const outcome = overrideOutcome || simulatedOutcome;
    setProcessing(true);
    setError('');

    try {
      // Realistic simulation animation
      setProcessingStepText('Connecting to ServiceHub Demo Payment Gateway...');
      await new Promise((resolve) => setTimeout(resolve, 600));

      if (activeTab === 'upi') {
        setProcessingStepText('Requesting UPI authorization from app...');
      } else if (activeTab === 'card') {
        setProcessingStepText('Processing 3D-Secure bank authentication...');
      } else {
        setProcessingStepText('Validating bank portal response...');
      }
      await new Promise((resolve) => setTimeout(resolve, 700));

      let methodLabel = 'UPI (Google Pay)';
      if (activeTab === 'upi') {
        methodLabel = `UPI (${selectedUpiApp.toUpperCase()})`;
      } else if (activeTab === 'card') {
        methodLabel = `Card (Ending in ${cardNumber.replace(/\s+/g, '').slice(-4) || '6789'})`;
      } else if (activeTab === 'netbanking') {
        methodLabel = `Net Banking (${selectedBank})`;
      } else {
        methodLabel = 'Digital Wallet (Demo)';
      }

      const payload = {
        paymentId: order?.paymentId,
        bookingId: activeBookingId,
        outcome,
        paymentMethod: methodLabel
      };

      if (outcome === 'FAILED') {
        payload.failureReason = failureReasonChoice;
      }

      const res = await completePayment(payload);
      setPaymentResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Payment simulation processing error.');
    } finally {
      setProcessing(false);
      setProcessingStepText('');
    }
  };

  if (loading) {
    return <Loading fullPage text="Launching Razorpay Demo Gateway..." />;
  }

  if (error && !order && !paymentResult) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4">
        <Card className="p-8 text-center space-y-4 shadow-sm border border-slate-200">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold shadow-2xs">
            !
          </div>
          <h2 className="text-xl font-black text-slate-900">
            Cannot Proceed to Payment
          </h2>
          <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
            {error}
          </p>
          <div className="pt-3 flex justify-center">
            <Button
              variant="outline"
              onClick={() => navigate(`/customer/bookings/${activeBookingId}`)}
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
  const transactionRef = paymentResult?.payment?.transactionId || paymentResult?.payment?.paymentReference || order?.gatewayOrderId || 'DEMO-TXN-COMPLETED';

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">

      {/* Prominent Demo Notice Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 text-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 text-left">
          <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg font-bold shrink-0">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-900 bg-amber-200 px-2.5 py-0.5 rounded-md">
                DEMO PAYMENT
              </span>
              <span className="text-xs font-bold text-slate-900">
                ServiceHub Payment Simulator
              </span>
            </div>
            <p className="text-[11px] text-amber-950/80 mt-0.5 font-medium">
              This is a simulated payment environment. No real money will be charged.
            </p>
          </div>
        </div>
        <div className="text-xs font-mono font-bold text-amber-900 bg-white/80 px-3 py-1.5 rounded-lg border border-amber-200 shrink-0">
          SIMULATED ENVIRONMENT
        </div>
      </div>

      {paymentResult?.success ? (
        /* SUCCESS CONFIRMATION SCREEN */
        <Card className="p-8 text-center space-y-6 border-emerald-200 bg-white shadow-lg rounded-3xl">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto text-3xl font-bold shadow-xs">
            ✓
          </div>
          <div className="space-y-1.5">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider">
              Transaction Verified
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Payment Successful!
            </h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Your service payment of <span className="font-bold text-slate-900">₹{Number(totalAmount).toLocaleString('en-IN')}</span> has been successfully processed in the simulated environment.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 max-w-lg mx-auto text-left text-xs space-y-2.5 border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Service Name:</span>
              <span className="font-bold text-slate-800">{serviceTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Assigned Technician:</span>
              <span className="font-semibold text-slate-800">{technicianTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Approved Total:</span>
              <span className="font-semibold text-slate-800">₹{Number(totalAmount).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Amount Debited (Demo):</span>
              <span className="font-black text-emerald-700 text-sm">₹{Number(totalAmount).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Gateway Provider:</span>
              <span className="font-extrabold text-blue-700">SERVICEHUB DEMO GATEWAY</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span className="text-slate-500 font-medium">Payment ID / Ref:</span>
              <span className="font-mono font-bold text-blue-600">{transactionRef}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Completed At:</span>
              <span className="text-slate-600 font-medium">{new Date().toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate(`/customer/bookings/${activeBookingId}`)}
              className="font-bold cursor-pointer"
            >
              View Updated Booking Details →
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/customer/bookings')}
              className="cursor-pointer"
            >
              My Bookings
            </Button>
          </div>
        </Card>
      ) : (
        /* RAZORPAY CHECKOUT INTERFACE */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative">
          
          {/* Simulated Gateway Processing Overlay */}
          {processing && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-6 text-white text-center space-y-4">
              <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold">Simulating Payment...</h3>
                <p className="text-xs text-blue-200 font-medium">{processingStepText || 'Communicating with banking servers...'}</p>
              </div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
                Test Environment Active
              </div>
            </div>
          )}

          {/* Razorpay Authentic Header */}
          <div className="bg-[#0b1d3a] text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-xl text-white shadow-inner">
                R
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold tracking-tight">ServiceHub Technologies</span>
                  <span className="bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                    TEST MODE
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <span>🔒 Razorpay Standard Checkout (Simulated)</span>
                </div>
              </div>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
              <span className="text-slate-400 text-xs block font-medium">Total Amount to Pay</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                ₹{Number(totalAmount).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Failure Alert if previous attempt was simulated as failed */}
          {paymentResult?.status === 'FAILED' && (
            <div className="p-4 bg-rose-50 border-b border-rose-200 text-xs text-rose-900 flex items-start gap-3">
              <span className="text-lg">❌</span>
              <div className="space-y-0.5">
                <span className="font-bold">Transaction Declined</span>
                <p className="text-rose-700">{paymentResult.message || 'Payment simulation marked as declined.'}</p>
                <p className="text-[11px] text-slate-600">Booking remains in Payment Pending. You may change options below and retry.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border-b border-rose-200 text-xs text-rose-800">
              {error}
            </div>
          )}

          {/* Main Checkout Body: Methods Nav & Method Content */}
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[380px]">
            
            {/* Left Method Tabs (4 Cols) */}
            <div className="md:col-span-4 bg-slate-50 border-r border-slate-200 p-3 space-y-1.5">
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Payment Options
              </div>

              {/* UPI Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('upi')}
                className={`w-full text-left p-3 rounded-2xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'upi'
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">⚡</span>
                  <div>
                    <div>UPI / QR Code</div>
                    <div className="text-[10px] text-slate-400 font-normal">GPay, PhonePe, Paytm, BHIM</div>
                  </div>
                </div>
                {activeTab === 'upi' && <span className="text-blue-600">›</span>}
              </button>

              {/* Card Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('card')}
                className={`w-full text-left p-3 rounded-2xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'card'
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">💳</span>
                  <div>
                    <div>Cards (Credit / Debit)</div>
                    <div className="text-[10px] text-slate-400 font-normal">Visa, Mastercard, RuPay</div>
                  </div>
                </div>
                {activeTab === 'card' && <span className="text-blue-600">›</span>}
              </button>

              {/* Net Banking Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('netbanking')}
                className={`w-full text-left p-3 rounded-2xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'netbanking'
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🏦</span>
                  <div>
                    <div>Net Banking</div>
                    <div className="text-[10px] text-slate-400 font-normal">All Indian Banks</div>
                  </div>
                </div>
                {activeTab === 'netbanking' && <span className="text-blue-600">›</span>}
              </button>

              {/* Wallet Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('wallet')}
                className={`w-full text-left p-3 rounded-2xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'wallet'
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">👛</span>
                  <div>
                    <div>Wallets / Pay Later</div>
                    <div className="text-[10px] text-slate-400 font-normal">Paytm, Mobikwik, Simpl</div>
                  </div>
                </div>
                {activeTab === 'wallet' && <span className="text-blue-600">›</span>}
              </button>

              <div className="pt-4 px-3 text-[10px] text-slate-400 border-t border-slate-200 space-y-1">
                <div className="font-semibold text-slate-500">Demo Order #{order?.gatewayOrderId || 'ORDER_DEMO'}</div>
                <div>Technician: {technicianTitle}</div>
              </div>
            </div>

            {/* Right Method Interactive Panel (8 Cols) */}
            <div className="md:col-span-8 p-5 sm:p-6 space-y-5 flex flex-col justify-between">
              <div>
                
                {/* 1. UPI TAB CONTENT */}
                {activeTab === 'upi' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Pay via UPI Apps or QR
                      </h4>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        ⚡ Instant Verification
                      </span>
                    </div>

                    {/* Quick App Selectors */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { id: 'gpay', name: 'Google Pay', icon: '🟢' },
                        { id: 'phonepe', name: 'PhonePe', icon: '🟣' },
                        { id: 'paytm', name: 'Paytm', icon: '🔵' },
                        { id: 'bhim', name: 'BHIM UPI', icon: '🟠' }
                      ].map((app) => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => setSelectedUpiApp(app.id)}
                          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                            selectedUpiApp === app.id
                              ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="text-xl mb-1">{app.icon}</div>
                          <div className="text-[11px] font-bold text-slate-800">{app.name}</div>
                        </button>
                      ))}
                    </div>

                    {/* VPA Input */}
                    <div className="space-y-1.5 pt-2">
                      <label className="block text-xs font-bold text-slate-700">
                        Enter UPI ID / VPA
                      </label>
                      <input
                        type="text"
                        value={vpaInput}
                        onChange={(e) => setVpaInput(e.target.value)}
                        placeholder="e.g. mobile@upi or name@okhdfcbank"
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500/20 outline-none"
                      />
                      <p className="text-[10px] text-slate-400">
                        A simulated payment request notification will be acknowledged automatically.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. CARDS TAB CONTENT */}
                {activeTab === 'card' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Credit or Debit Card
                      </h4>
                      <div className="flex gap-1 text-sm">
                        <span>💳</span>
                        <span className="text-[10px] font-bold text-slate-500">Visa / MC / RuPay</span>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Card Number</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4532 0000 0000 0000"
                          className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Valid Thru (MM/YY)</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="MM/YY"
                            maxLength={5}
                            className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-blue-500/20 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">CVV / CVC</label>
                          <input
                            type="password"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="•••"
                            maxLength={4}
                            className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-blue-500/20 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Cardholder Name</label>
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          placeholder="Name as printed on card"
                          className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. NET BANKING TAB CONTENT */}
                {activeTab === 'netbanking' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Select Your Bank
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {POPULAR_BANKS.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelectedBank(b.id)}
                          className={`p-3 rounded-2xl border text-left text-xs transition-all cursor-pointer ${
                            selectedBank === b.id
                              ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 font-bold text-blue-900'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="text-lg mb-1">{b.icon}</div>
                          <div className="text-xs font-bold">{b.name}</div>
                        </button>
                      ))}
                    </div>

                    <div className="pt-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Or search all other Indian banks:</label>
                      <select
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white"
                      >
                        <option value="HDFC">HDFC Bank</option>
                        <option value="SBI">State Bank of India</option>
                        <option value="ICICI">ICICI Bank</option>
                        <option value="AXIS">Axis Bank</option>
                        <option value="KOTAK">Kotak Mahindra Bank</option>
                        <option value="PNB">Punjab National Bank</option>
                        <option value="BOB">Bank of Baroda</option>
                        <option value="YES">Yes Bank</option>
                        <option value="INDUSIND">IndusInd Bank</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* 4. WALLET TAB CONTENT */}
                {activeTab === 'wallet' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Select Digital Wallet
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'paytm', name: 'Paytm Wallet', icon: '🔵' },
                        { id: 'phonepe', name: 'PhonePe Wallet', icon: '🟣' },
                        { id: 'mobikwik', name: 'MobiKwik', icon: '🟢' },
                        { id: 'simpl', name: 'Simpl (Pay Later)', icon: '⚡' }
                      ].map((w) => (
                        <div key={w.id} className="p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3">
                          <span className="text-2xl">{w.icon}</span>
                          <div>
                            <div className="text-xs font-bold text-slate-800">{w.name}</div>
                            <div className="text-[10px] text-slate-400">Linked Account Active</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Simulation Outcome Controller & Primary Pay Button */}
              <div className="pt-4 border-t border-slate-200 space-y-4">
                
                {/* Developer / Demo Mode Toggle */}
                <div className="p-3 bg-amber-500/10 border border-amber-300/80 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-950 flex items-center gap-1.5">
                      <span>⚙️</span> Sandbox Outcome Simulator:
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-800">
                      DEMO CONTROL
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <label className={`flex-1 p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                      simulatedOutcome === 'SUCCESS'
                        ? 'bg-white border-emerald-500 text-emerald-700 shadow-xs'
                        : 'border-transparent text-slate-600 hover:bg-white/50'
                    }`}>
                      <input
                        type="radio"
                        name="simOutcome"
                        value="SUCCESS"
                        checked={simulatedOutcome === 'SUCCESS'}
                        onChange={() => setSimulatedOutcome('SUCCESS')}
                        className="text-emerald-600"
                      />
                      <span>✓ Authorize &amp; Complete (Success)</span>
                    </label>

                    <label className={`flex-1 p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                      simulatedOutcome === 'FAILED'
                        ? 'bg-white border-rose-500 text-rose-700 shadow-xs'
                        : 'border-transparent text-slate-600 hover:bg-white/50'
                    }`}>
                      <input
                        type="radio"
                        name="simOutcome"
                        value="FAILED"
                        checked={simulatedOutcome === 'FAILED'}
                        onChange={() => setSimulatedOutcome('FAILED')}
                        className="text-rose-600"
                      />
                      <span>✕ Decline Payment (Test Failure)</span>
                    </label>
                  </div>

                  {simulatedOutcome === 'FAILED' && (
                    <div className="pt-1">
                      <select
                        value={failureReasonChoice}
                        onChange={(e) => setFailureReasonChoice(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-amber-300 bg-white"
                      >
                        <option value="Simulated card decline / authorization failed">Card decline / authorization failed</option>
                        <option value="Insufficient demo balance in account">Insufficient demo balance in account</option>
                        <option value="Simulated bank timeout">Bank gateway timeout</option>
                        <option value="Simulated user cancelled payment on app">User cancelled transaction on UPI app</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Big Razorpay CTA Button */}
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleSimulatePayment()}
                  className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-sm shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <span>🔒</span>
                  <span>
                    Pay ₹{Number(totalAmount).toLocaleString('en-IN')} (Demo Simulation)
                  </span>
                </button>

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>Secured by 256-bit SSL encryption</span>
                  <Link
                    to={`/customer/bookings/${activeBookingId}`}
                    className="text-slate-500 hover:text-slate-800 font-medium underline"
                  >
                    Cancel &amp; Return
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoCheckoutPage;
