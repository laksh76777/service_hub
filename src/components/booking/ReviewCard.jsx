import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { getBookingReview, createReview } from '../../services/api';

const ReviewCard = ({ booking, isCustomer }) => {
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchReview = async () => {
    if (!booking?._id) return;
    try {
      setLoading(true);
      const res = await getBookingReview(booking._id);
      setReview(res.data || null);
    } catch (err) {
      setReview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReview();
  }, [booking?._id]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await createReview({
        bookingId: booking._id,
        rating,
        review: comment,
        comment
      });
      setReview(res.data || res.review);
      setComment('');
    } catch (err) {
      setError(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const isCompleted = ['COMPLETED', 'CUSTOMER_CONFIRMED', 'WORK_COMPLETED', 'INVOICED'].includes(booking?.status);

  return (
    <Card className="p-6">
      <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>⭐</span> Verified Service Review
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Only customers with verified completed bookings can review technicians.
        </p>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-500">Loading review...</div>
      ) : review ? (
        /* Display Existing Review */
        <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-amber-500 text-base">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star}>
                  {star <= review.rating ? '★' : '☆'}
                </span>
              ))}
              <span className="ml-2 font-bold text-slate-900 dark:text-white text-xs">
                {review.rating}.0 / 5.0
              </span>
            </div>

            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <span>✓</span> Verified Work
            </span>
          </div>

          {review.comment ? (
            <p className="text-slate-700 dark:text-slate-300 italic pt-1">
              "{review.comment}"
            </p>
          ) : (
            <p className="text-slate-400 italic pt-1">No written comment provided.</p>
          )}

          <div className="text-[10px] text-slate-400 pt-1">
            Submitted on {new Date(review.createdAt).toLocaleDateString('en-IN')}
          </div>
        </div>
      ) : !isCompleted ? (
        /* Not Yet Completed */
        <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl mt-4 border border-dashed border-slate-200 dark:border-slate-700">
          Reviews are unlocked once the service reaches <strong>COMPLETED</strong> status.
        </div>
      ) : isCustomer ? (
        /* Submit Review Form for Customer */
        <form onSubmit={handleSubmitReview} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Your Rating *
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="text-2xl text-amber-400 focus:outline-none transition-transform hover:scale-110"
                >
                  {star <= (hoverRating || rating) ? '★' : '☆'}
                </button>
              ))}
              <span className="ml-2 font-bold text-slate-700 dark:text-slate-300 text-sm">
                {hoverRating || rating} Star{rating > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Feedback / Workmanship Review
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe promptness, technical quality, cleanliness, and overall satisfaction..."
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="p-2 rounded bg-rose-50 text-rose-600 text-xs">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={submitting}
          >
            Submit Verified Review
          </Button>
        </form>
      ) : (
        <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl mt-4">
          Awaiting customer review.
        </div>
      )}
    </Card>
  );
};

export default ReviewCard;
