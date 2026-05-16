const { Task } = require('./taskModel');

async function getDashboardSummary(userId) {
  const [summary] = await Task.aggregate([
    {
      $match: {
        $or: [{ created_by: Number(userId) }, { assignee_id: Number(userId) }],
      },
    },
    {
      $group: {
        _id: null,
        total_tasks: { $sum: 1 },
        completed_tasks: {
          $sum: {
            $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0],
          },
        },
        pending_tasks: {
          $sum: {
            $cond: [{ $ne: ['$status', 'Completed'] }, 1, 0],
          },
        },
        overdue_tasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$status', 'Completed'] },
                  { $lt: ['$deadline', new Date()] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  return (
    summary || {
      total_tasks: 0,
      completed_tasks: 0,
      pending_tasks: 0,
      overdue_tasks: 0,
    }
  );
}

module.exports = { getDashboardSummary };
