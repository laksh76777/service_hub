const NotificationService = require('../services/notificationService');

const getNotifications = async (req, res) => {
  try {
    const { unreadOnly, page, limit } = req.query;
    const result = await NotificationService.getUserNotifications(req.user._id, {
      unreadOnly: unreadOnly === 'true',
      page,
      limit
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve notifications.'
    });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await NotificationService.markAsRead(id, req.user._id);

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: notification
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to update notification.'
    });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await NotificationService.markAllAsRead(req.user._id);

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      data: result
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to update notifications.'
    });
  }
};

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
};
