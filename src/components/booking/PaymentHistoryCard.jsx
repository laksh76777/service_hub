import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import { getPaymentHistory } from '../../services/api';

const PaymentHistoryCard = ({ bookingId, refreshTrigger }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPayments = async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      setError('');
      const res = await getPaymentHistory(bookingId);
      setPayments(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load payment history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [bookingId, refreshTrigger]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <span>✓</span> Successful
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <span>✕</span> Failed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <span>⊘</span> Cancelled
          </span>
        );
      case 'PENDING':
      case 'CREATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <span>⏳</span> Processing
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
            <span>↺</span> Refunded
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            {status}
          </span>
        );
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>💳</span> Payment History & Transactions
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Audit log of all gateway attempts, transactions, and status updates for this booking.
          </p>
        </div>
        <button
          onClick={fetchPayments}
          disabled={loading}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          title="Refresh payment logs"
        >
          {loading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-gray-500">Loading payment history...</div>
      ) : error ? (
        <div className="py-4 text-center text-xs text-rose-500">{error}</div>
      ) : payments.length === 0 ? (
        <div className="py-8 text-center bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 mt-4">
          <div className="text-3xl mb-1">💳</div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            No payment attempts yet.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            Transactions will appear here once an invoice payment is initiated via the checkout gateway.
          </p>
        </div>
      ) : (
        <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
          {payments.map((p) => (
            <div key={p._id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 dark:text-white text-sm">
                    ₹{p.amount?.toLocaleString('en-IN') || 0}
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {p.gateway || 'DEMO'} GATEWAY
                  </span>
                  {getStatusBadge(p.status)}
                </div>

                <div className="text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                  {p.transactionId ? (
                    <span>
                      Txn ID: <strong className="font-mono text-gray-700 dark:text-gray-300">{p.transactionId}</strong>
                    </span>
                  ) : p.gatewayOrderId ? (
                    <span>
                      Order ID: <strong className="font-mono text-gray-700 dark:text-gray-300">{p.gatewayOrderId}</strong>
                    </span>
                  ) : null}
                  <span>•</span>
                  <span>{new Date(p.createdAt).toLocaleString('en-IN')}</span>
                </div>

                {p.failureReason && (
                  <div className="text-rose-600 dark:text-rose-400 text-[11px] font-medium bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded">
                    Reason: {p.failureReason}
                  </div>
                )}
              </div>

              {p.paidAt && (
                <div className="text-right text-[11px] text-gray-500 dark:text-gray-400">
                  <span className="block text-emerald-600 dark:text-emerald-400 font-semibold">
                    ✓ Verified & Reconciled
                  </span>
                  <span>{new Date(p.paidAt).toLocaleTimeString('en-IN')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default PaymentHistoryCard;
