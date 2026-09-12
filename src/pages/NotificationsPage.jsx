import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [markingId, setMarkingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await getNotifications({ limit: 50 });
      if (res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (e, notif) => {
    e.stopPropagation();
    if (notif.isRead) return;

    setMarkingId(notif._id);
    try {
      await markNotificationRead(notif._id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await markNotificationRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Error marking as read:', err);
      }
    }

    const bookingId = notif.bookingId?._id || notif.bookingId || notif.data?.bookingId;
    if (bookingId) {
      navigate(`/bookings/${bookingId}`);
    } else if (notif.data?.link) {
      navigate(notif.data.link);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'BOOKING_REQUESTED':
        return '📬';
      case 'BOOKING_ACCEPTED':
        return '✅';
      case 'BOOKING_REJECTED':
      case 'BOOKING_CANCELLED':
        return '❌';
      case 'ESTIMATE_SUBMITTED':
      case 'ESTIMATE_CREATED':
        return '📝';
      case 'ESTIMATE_APPROVED':
        return '🤝';
      case 'PAYMENT_SUCCESS':
        return '💳';
      case 'PAYMENT_FAILED':
        return '⚠️';
      case 'WORK_STARTED':
        return '⚡';
      case 'WORK_COMPLETED':
      case 'CUSTOMER_CONFIRMED':
        return '🏁';
      case 'INVOICE_GENERATED':
        return '🧾';
      case 'WARRANTY_AVAILABLE':
        return '🛡️';
      case 'REVIEW_REQUESTED':
        return '⭐';
      case 'DISPUTE_CREATED':
        return '⚖️';
      default:
        return '🔔';
    }
  };

  const displayedNotifications = notifications.filter((notif) => {
    if (filter === 'UNREAD') return !notif.isRead;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold animate-pulse">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time notifications across your booking, estimate, and payment lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
              className="text-xs font-semibold"
            >
              {markingAll ? 'Marking...' : 'Mark all as read'}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchNotifications}
            className="text-xs font-semibold"
            title="Refresh"
          >
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mt-6 mb-4">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            filter === 'ALL'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            filter === 'UNREAD'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-3" />
          <p className="text-sm">Loading notifications...</p>
        </div>
      ) : displayedNotifications.length === 0 ? (
        <Card className="p-12 text-center text-slate-400 border border-dashed border-slate-200">
          <span className="text-4xl block mb-2">📭</span>
          <h3 className="text-base font-bold text-slate-700">No notifications found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {filter === 'UNREAD'
              ? 'You have caught up with all notifications. Good job!'
              : 'You have not received any notifications yet. Status updates will appear here.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayedNotifications.map((notif) => {
            const bookingId = notif.bookingId?._id || notif.bookingId || notif.data?.bookingId;
            const bookingNumber = notif.bookingId?.bookingNumber || notif.data?.bookingNumber;

            return (
              <div
                key={notif._id}
                onClick={() => handleNotificationClick(notif)}
                className={`group p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                  !notif.isRead
                    ? 'bg-blue-50/50 border-blue-200 hover:border-blue-300 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg flex-shrink-0 shadow-xs">
                    {getTypeIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {notif.title}
                        </h4>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                        )}
                      </div>

                      <span className="text-[11px] text-slate-400">
                        {new Date(notif.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-100 flex-wrap">
                      <div className="flex items-center gap-2">
                        {bookingNumber && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
                            #{bookingNumber}
                          </span>
                        )}
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                          {notif.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {!notif.isRead && (
                          <button
                            onClick={(e) => handleMarkAsRead(e, notif)}
                            disabled={markingId === notif._id}
                            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:underline"
                          >
                            Mark read
                          </button>
                        )}
                        {(bookingId || notif.data?.link) && (
                          <span className="text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                            View details &rarr;
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
