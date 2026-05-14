const asyncHandler = require('../utils/asyncHandler');
const reportModel = require('../models/reportModel');

const getWeeklyReport = asyncHandler(async (request, response) => {
  const report = await reportModel.getWeeklyReport(request.user.id);

  response.status(200).json({
    success: true,
    message: 'Weekly report fetched successfully',
    data: report,
  });
});

const getStatusDistribution = asyncHandler(async (request, response) => {
  const distribution = await reportModel.getStatusDistribution(request.user.id);

  response.status(200).json({
    success: true,
    message: 'Status distribution fetched successfully',
    data: distribution,
  });
});

const getCategoryAnalysis = asyncHandler(async (request, response) => {
  const analysis = await reportModel.getCategoryAnalysis(request.user.id);

  response.status(200).json({
    success: true,
    message: 'Category analysis fetched successfully',
    data: analysis,
  });
});

const getProductivity = asyncHandler(async (request, response) => {
  const productivity = await reportModel.getProductivity(request.user.id);
  const totalTasks = Number(productivity.total_tasks || 0);
  const completedTasks = Number(productivity.completed_tasks || 0);

  response.status(200).json({
    success: true,
    message: 'Productivity report fetched successfully',
    data: {
      totalTasks,
      completedTasks,
      overdueTasks: Number(productivity.overdue_tasks || 0),
      productivityPercentage: totalTasks
        ? Number(((completedTasks / totalTasks) * 100).toFixed(2))
        : 0,
    },
  });
});

module.exports = {
  getWeeklyReport,
  getStatusDistribution,
  getCategoryAnalysis,
  getProductivity,
};
