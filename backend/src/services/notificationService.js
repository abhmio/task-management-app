const notificationModel = require('../models/notificationModel');
const taskModel = require('../models/taskModel');

async function createTaskAssignedNotification(task) {
  if (!task.assignee_id) {
    return null;
  }

  const message = `You were assigned a new task: ${task.title}`;

  return notificationModel.createNotification({
    user_id: task.assignee_id,
    message,
    type: 'task_assigned',
  });
}

async function createDeadlineReminderNotifications(userId) {
  const { tasks } = await taskModel.findTasks(
    {
      assigneeId: userId,
      status: 'pending',
      sortBy: 'deadline',
    },
    { limit: 100, offset: 0 },
  );

  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);

  const reminders = [];

  for (const task of tasks) {
    const deadline = new Date(task.deadline);
    if (deadline < now || deadline > tomorrow) {
      continue;
    }

    const message = `Reminder: "${task.title}" is due on ${task.deadline}`;
    const exists = await notificationModel.reminderExists(userId, message);

    if (!exists) {
      reminders.push(
        notificationModel.createNotification({
          user_id: userId,
          message,
          type: 'reminder',
        }),
      );
    }
  }

  return Promise.all(reminders);
}

module.exports = {
  createTaskAssignedNotification,
  createDeadlineReminderNotifications,
};
