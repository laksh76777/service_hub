import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../common/Card';
import Button from '../common/Button';
import { getBookingInvoice, generateInvoice, getInvoicePdfUrl } from '../../services/api';

const InvoiceCard = ({ booking, isCustomer, isProvider, isAdmin, onInvoiceCreated }) => {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const res = await getBookingInvoice(booking._id);
      setInvoice(res.invoice || null);
    } catch (err) {
      // 404 is normal when invoice not yet generated
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (booking?._id) {
      fetchInvoice();
    }
  }, [booking?._id]);

  const handleGenerateInvoice = async () => {
    setGenerating(true);
    try {
      const res = await generateInvoice(booking._id);
      alert(res.message || 'Invoice generated successfully!');
      setInvoice(res.invoice);
      if (onInvoiceCreated) onInvoiceCreated(res.invoice);
    } catch (err) {
      alert(err.message || 'Failed to generate invoice. Ensure at least one estimate has been approved by customer.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>🧾</span> Final Tax Invoice
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            GST-compliant tax invoice compiled exclusively from customer-approved estimate scope.
          </p>
        </div>
        {invoice && (
          <a
            href={getInvoicePdfUrl(invoice._id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
          >
            <span>📥</span> Download PDF Invoice
          </a>
        )}
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-gray-500">Checking invoice status...</div>
      ) : !invoice ? (
        <div className="py-8 text-center bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 mt-4">
          <div className="text-3xl mb-1">📄</div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            No invoice issued yet.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
            Invoices are compiled from approved work estimates after completion verification.
          </p>
          {(isProvider || isAdmin) && ['CUSTOMER_VERIFIED', 'COMPLETED'].includes(booking.status) && (
            <div className="mt-4">
              <Button
                size="sm"
                variant="primary"
                loading={generating}
                onClick={handleGenerateInvoice}
              >
                Generate Final Tax Invoice
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Invoice Header Details */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
            <div>
              <span className="text-gray-400 text-[10px] uppercase font-bold block">Invoice Number</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white text-sm">
                {invoice.invoiceNumber}
              </span>
            </div>
            <div>
              <span className="text-gray-400 text-[10px] uppercase font-bold block">Issue Date</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {new Date(invoice.issuedAt || invoice.createdAt).toLocaleDateString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-gray-400 text-[10px] uppercase font-bold block">Status</span>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                invoice.status === 'PAID'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
              }`}>
                {invoice.status === 'PAID' ? '✓ PAID' : invoice.status}
              </span>
            </div>
          </div>

          {/* Billed Line Items Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-center">Type</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
                {invoice.items?.map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-2 px-3">
                      <span className="font-medium">{it.description}</span>
                      {it.isAdditionalWork && (
                        <span className="ml-2 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Extra Scope
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center text-[10px] uppercase text-gray-400">
                      {it.type}
                    </td>
                    <td className="py-2 px-3 text-center">{it.quantity}</td>
                    <td className="py-2 px-3 text-right">₹{it.unitPrice}</td>
                    <td className="py-2 px-3 text-right font-semibold">₹{it.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Totals & Payment CTA */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-3 text-xs border-t border-gray-100 dark:border-gray-800">
            <div>
              {invoice.status === 'PAID' || invoice.remainingAmount === 0 ? (
                <div className="flex items-center gap-2 p-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold">
                  <span>✓</span> Invoice Settled in Full
                </div>
              ) : isCustomer ? (
                <Link
                  to={`/checkout/${booking._id}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all hover:scale-[1.02]"
                >
                  <span>💳</span> Pay Now (Demo Gateway)
                </Link>
              ) : (
                <div className="text-amber-600 dark:text-amber-400 font-semibold text-[11px] flex items-center gap-1.5">
                  <span>⏳</span> Awaiting customer payment
                </div>
              )}
            </div>

            <div className="text-right space-y-1 ml-auto">
              <div className="text-gray-500">
                Subtotal: <span className="font-semibold text-gray-800 dark:text-gray-200">₹{invoice.subtotal}</span>
              </div>
              <div className="text-gray-500">
                GST (18%): <span className="font-semibold text-gray-800 dark:text-gray-200">₹{invoice.tax || invoice.taxes}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="text-emerald-600">
                  Discount: -₹{invoice.discount}
                </div>
              )}
              <div className="text-base font-black text-gray-900 dark:text-white pt-1 border-t border-gray-100 dark:border-gray-800">
                Total: <span className="text-blue-600 dark:text-blue-400">₹{invoice.total}</span>
              </div>
              <div className={`text-xs font-bold ${invoice.remainingAmount === 0 ? 'text-emerald-600' : 'text-gray-600 dark:text-gray-400'}`}>
                Balance Due: ₹{invoice.remainingAmount}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default InvoiceCard;
