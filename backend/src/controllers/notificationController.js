const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const notificationModel = require('../models/notificationModel');
const notificationService = require('../services/notificationService');

const getNotifications = asyncHandler(async (request, response) => {
  await notificationService.createDeadlineReminderNotifications(request.user.id);
  const notifications = await notificationModel.findUserNotifications(request.user.id);

  response.status(200).json({
    success: true,
    message: 'Notifications fetched successfully',
    data: notifications,
  });
});

const markNotificationRead = asyncHandler(async (request, response) => {
  const notification = await notificationModel.markAsRead(
    request.params.id,
    request.user.id,
  );

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  response.status(200).json({
    success: true,
    message: 'Notification marked as read',
    data: notification,
  });
});

const markAllNotificationsRead = asyncHandler(async (request, response) => {
  const updatedCount = await notificationModel.markAllAsRead(request.user.id);

  response.status(200).json({
    success: true,
    message: 'All notifications marked as read',
    data: { updatedCount },
  });
});

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
