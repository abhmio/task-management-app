const { Task } = require('./taskModel');

function startOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfCurrentWeek() {
  const end = new Date(startOfCurrentWeek());
  end.setDate(end.getDate() + 7);
  return end;
}

async function getWeeklyReport(userId) {
  return Task.aggregate([
    {
      $match: {
        $or: [{ created_by: Number(userId) }, { assignee_id: Number(userId) }],
        deadline: {
          $gte: startOfCurrentWeek(),
          $lt: endOfCurrentWeek(),
        },
      },
    },
    {
      $group: {
        _id: { $dayOfWeek: '$deadline' },
        day_name: {
          $first: {
            $arrayElemAt: [
              [
                '',
                'Sunday',
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday',
              ],
              { $dayOfWeek: '$deadline' },
            ],
          },
        },
        task_count: { $sum: 1 },
        completed_count: {
          $sum: {
            $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        day_name: 1,
        task_count: 1,
        completed_count: 1,
      },
    },
  ]);
}

async function getStatusDistribution(userId) {
  return Task.aggregate([
    {
      $match: {
        $or: [{ created_by: Number(userId) }, { assignee_id: Number(userId) }],
      },
    },
    {
      $group: {
        _id: '$status',
        total: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        status: '$_id',
        total: 1,
      },
    },
  ]);
}

async function getCategoryAnalysis(userId) {
  return Task.aggregate([
    {
      $match: {
        $or: [{ created_by: Number(userId) }, { assignee_id: Number(userId) }],
      },
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        category: '$_id',
        total: 1,
      },
    },
  ]);
}

async function getProductivity(userId) {
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
      overdue_tasks: 0,
    }
  );
}

module.exports = {
  getWeeklyReport,
  getStatusDistribution,
  getCategoryAnalysis,
  getProductivity,
};
