const pool = require('../config/db');

async function createNotification({ user_id, message, type }) {
  const [result] = await pool.execute(
    `INSERT INTO notifications (user_id, message, type, is_read)
     VALUES (?, ?, ?, 0)`,
    [user_id, message, type],
  );

  return findNotificationById(result.insertId, user_id);
}

async function findNotificationById(id, userId) {
  const [rows] = await pool.execute(
    `SELECT id, user_id, message, type, is_read, created_at
     FROM notifications
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
    [id, userId],
  );

  return rows[0] || null;
}

async function findUserNotifications(userId) {
  const [rows] = await pool.execute(
    `SELECT id, user_id, message, type, is_read, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId],
  );

  return rows;
}

async function markAsRead(id, userId) {
  await pool.execute(
    `UPDATE notifications
     SET is_read = 1
     WHERE id = ? AND user_id = ?`,
    [id, userId],
  );

  return findNotificationById(id, userId);
}

async function markAllAsRead(userId) {
  const [result] = await pool.execute(
    `UPDATE notifications
     SET is_read = 1
     WHERE user_id = ? AND is_read = 0`,
    [userId],
  );

  return result.affectedRows;
}

async function reminderExists(userId, message) {
  const [rows] = await pool.execute(
    `SELECT id
     FROM notifications
     WHERE user_id = ? AND message = ? AND type = 'reminder'
     LIMIT 1`,
    [userId, message],
  );

  return Boolean(rows[0]);
}

module.exports = {
  createNotification,
  findUserNotifications,
  markAsRead,
  markAllAsRead,
  reminderExists,
};
