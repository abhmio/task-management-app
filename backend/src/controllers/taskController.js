const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getPagination } = require('../utils/pagination');
const taskModel = require('../models/taskModel');
const userModel = require('../models/userModel');
const notificationService = require('../services/notificationService');

const createTask = asyncHandler(async (request, response) => {
  if (request.body.assignee_id) {
    const assignee = await userModel.findById(request.body.assignee_id);
    if (!assignee) {
      throw new ApiError(404, 'Assignee user not found');
    }
  }

  const task = await taskModel.createTask({
    ...request.body,
    created_by: request.user.id,
  });

  await notificationService.createTaskAssignedNotification(task);

  response.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: task,
  });
});

const getTasks = asyncHandler(async (request, response) => {
  const pagination = getPagination(request.query);
  const filters = {
    status: request.query.status ? String(request.query.status).toLowerCase() : '',
    priority: request.query.priority || '',
    search: request.query.search || '',
    assigneeId: request.query.user || '',
    sortBy: request.query.sortBy || 'deadline',
    accessUserId: request.user.id,
  };

  const result = await taskModel.findTasks(filters, pagination);

  response.status(200).json({
    success: true,
    message: 'Tasks fetched successfully',
    data: result.tasks,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / pagination.limit),
    },
  });
});

const getTaskById = asyncHandler(async (request, response) => {
  const task = await taskModel.findTaskById(request.params.id, request.user.id);

  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  response.status(200).json({
    success: true,
    message: 'Task fetched successfully',
    data: task,
  });
});

const updateTask = asyncHandler(async (request, response) => {
  if (request.body.assignee_id) {
    const assignee = await userModel.findById(request.body.assignee_id);
    if (!assignee) {
      throw new ApiError(404, 'Assignee user not found');
    }
  }

  const existingTask = await taskModel.findTaskById(request.params.id, request.user.id);
  if (!existingTask) {
    throw new ApiError(404, 'Task not found');
  }

  const updatedTask = await taskModel.updateTask(
    request.params.id,
    request.body,
    request.user.id,
  );

  if (
    request.body.assignee_id &&
    Number(request.body.assignee_id) !== Number(existingTask.assignee_id)
  ) {
    await notificationService.createTaskAssignedNotification(updatedTask);
  }

  response.status(200).json({
    success: true,
    message: 'Task updated successfully',
    data: updatedTask,
  });
});

const deleteTask = asyncHandler(async (request, response) => {
  const deleted = await taskModel.deleteTask(request.params.id, request.user.id);

  if (!deleted) {
    throw new ApiError(404, 'Task not found');
  }

  response.status(200).json({
    success: true,
    message: 'Task deleted successfully',
  });
});

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
};
