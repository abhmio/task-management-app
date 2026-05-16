const { mongoose } = require('../config/db');
const { getNextSequence } = require('./counterModel');
const userModel = require('./userModel');

const notificationSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    user_id: {
      type: Number,
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['task_assigned', 'reminder', 'update'],
      required: true,
      index: true,
    },
    is_read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
    versionKey: false,
  },
);

notificationSchema.pre('save', async function assignNumericId(next) {
  if (!this.id) {
    this.id = await getNextSequence('notifications');
  }

  next();
});

const Notification =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

function mapNotification(document) {
  if (!document) {
    return null;
  }

  return {
    id: document.id,
    user_id: document.user_id,
    message: document.message,
    type: document.type,
    is_read: document.is_read,
    created_at: document.createdAt,
  };
}

async function createNotification({ user_id, message, type }) {
  const user = await userModel.findDocumentById(user_id);
  if (!user) {
    return null;
  }

  const notification = await Notification.create({
    user: user._id,
    user_id: user.id,
    message,
    type,
    is_read: false,
  });

  return mapNotification(notification);
}

async function findNotificationById(id, userId) {
  const notification = await Notification.findOne({
    id: Number(id),
    user_id: Number(userId),
  });

  return mapNotification(notification);
}

async function findUserNotifications(userId) {
  const notifications = await Notification.find({ user_id: Number(userId) })
    .sort({ createdAt: -1 })
    .lean();

  return notifications.map(mapNotification);
}

async function markAsRead(id, userId) {
  const notification = await Notification.findOneAndUpdate(
    {
      id: Number(id),
      user_id: Number(userId),
    },
    { $set: { is_read: true } },
    { new: true },
  );

  return mapNotification(notification);
}

async function markAllAsRead(userId) {
  const result = await Notification.updateMany(
    {
      user_id: Number(userId),
      is_read: false,
    },
    { $set: { is_read: true } },
  );

  return result.modifiedCount;
}

async function reminderExists(userId, message) {
  const notification = await Notification.findOne({
    user_id: Number(userId),
    message,
    type: 'reminder',
  }).lean();

  return Boolean(notification);
}

module.exports = {
  Notification,
  createNotification,
  findUserNotifications,
  markAsRead,
  markAllAsRead,
  reminderExists,
};
