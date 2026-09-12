const Notification = require('../models/Notification');
const { NOTIFICATION_TYPE } = require('../utils/constants');

class NotificationService {
  /**
   * Safely dispatches an in-app notification to a user
   *
   * @param {Object} params
   * @param {string|ObjectId} params.recipientId - Recipient user ID
   * @param {string|ObjectId} [params.senderId] - Actor user ID who triggered event
   * @param {string} params.type - One of NOTIFICATION_TYPE
   * @param {string} params.title - Human readable notification title
   * @param {string} params.message - Notification message
   * @param {Object} [params.data] - Contextual metadata (bookingId, disputeId, etc.)
   */
  async notify({ recipientId, senderId, type, title, message, data = {} }) {
    if (!recipientId || !type || !title || !message) {
      console.warn('[NotificationService] Missing required parameters:', { recipientId, type, title });
      return null;
    }

    try {
      const notification = await Notification.create({
        recipientId,
        senderId: senderId || null,
        type,
        title,
        message,
        data,
        isRead: false
      });

      return notification;
    } catch (error) {
      console.error('[NotificationService] Failed to create notification:', error.message);
      return null;
    }
  }

  /**
   * Fetches user's notifications with pagination and unread counts
   */
  async getUserNotifications(userId, { unreadOnly = false, page = 1, limit = 20 } = {}) {
    const filter = { recipientId: userId };
    if (unreadOnly) {
      filter.isRead = false;
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10)));

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipientId: userId, isRead: false })
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      const err = new Error('Notification not found or access denied.');
      err.status = 404;
      throw err;
    }

    return notification;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return { modifiedCount: result.modifiedCount };
  }
}

module.exports = new NotificationService();
