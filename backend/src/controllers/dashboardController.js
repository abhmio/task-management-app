const asyncHandler = require('../utils/asyncHandler');
const dashboardModel = require('../models/dashboardModel');

const getSummary = asyncHandler(async (request, response) => {
  const summary = await dashboardModel.getDashboardSummary(request.user.id);

  response.status(200).json({
    success: true,
    message: 'Dashboard summary fetched successfully',
    data: {
      totalTasks: Number(summary.total_tasks || 0),
      completedTasks: Number(summary.completed_tasks || 0),
      pendingTasks: Number(summary.pending_tasks || 0),
      overdueTasks: Number(summary.overdue_tasks || 0),
    },
  });
});

module.exports = { getSummary };
