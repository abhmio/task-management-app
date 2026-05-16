const { mongoose } = require('../config/db');
const { getNextSequence } = require('./counterModel');
const { buildTaskFilters } = require('../utils/queryBuilder');
const userModel = require('./userModel');

const taskSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['To Do', 'In Progress', 'Completed'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['Work', 'Personal', 'Academic'],
      required: true,
      index: true,
    },
    deadline: {
      type: Date,
      required: true,
      index: true,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignee_id: {
      type: Number,
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    created_by: {
      type: Number,
      required: true,
      index: true,
    },
    evaluationBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    evaluation_by: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: true },
    versionKey: false,
  },
);

taskSchema.pre('save', async function assignNumericId(next) {
  if (!this.id) {
    this.id = await getNextSequence('tasks');
  }

  next();
});

taskSchema.index({ title: 'text', description: 'text' });

const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

function priorityOrderExpression() {
  return {
    $switch: {
      branches: [
        { case: { $eq: ['$priority', 'High'] }, then: 1 },
        { case: { $eq: ['$priority', 'Medium'] }, then: 2 },
        { case: { $eq: ['$priority', 'Low'] }, then: 3 },
      ],
      default: 4,
    },
  };
}

function mapTaskRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    priority: row.priority,
    status: row.status,
    category: row.category,
    deadline: row.deadline,
    assignee_id: row.assignee_id ?? null,
    assignee_name: row.assignee_name || null,
    created_by: row.created_by,
    created_by_name: row.created_by_name || null,
    evaluation_by: row.evaluation_by ?? null,
    progress: row.progress ?? 0,
    created_at: row.createdAt || row.created_at,
  };
}

async function resolveUserReferences(task) {
  const createdByUser = await userModel.findDocumentById(task.created_by);
  if (!createdByUser) {
    return null;
  }

  let assigneeUser = null;
  if (task.assignee_id) {
    assigneeUser = await userModel.findDocumentById(task.assignee_id);
  }

  let evaluationUser = null;
  if (task.evaluation_by) {
    evaluationUser = await userModel.findDocumentById(task.evaluation_by);
  }

  return {
    createdByUser,
    assigneeUser,
    evaluationUser,
  };
}

function buildAggregatePipeline(matchQuery, { limit, offset, sortBy, exactId } = {}) {
  const pipeline = [];
  const query = { ...matchQuery };

  if (query.$and?.length === 1) {
    Object.assign(query, query.$and[0]);
    delete query.$and;
  }

  pipeline.push({ $match: query });

  if (sortBy === 'priority') {
    pipeline.push({ $addFields: { priorityOrder: priorityOrderExpression() } });
  }

  pipeline.push(
    {
      $lookup: {
        from: 'users',
        localField: 'assignee_id',
        foreignField: 'id',
        as: 'assigneeUser',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'created_by',
        foreignField: 'id',
        as: 'creatorUser',
      },
    },
    {
      $addFields: {
        assignee_name: { $arrayElemAt: ['$assigneeUser.name', 0] },
        created_by_name: { $arrayElemAt: ['$creatorUser.name', 0] },
      },
    },
    {
      $project: {
        _id: 0,
        id: 1,
        title: 1,
        description: 1,
        priority: 1,
        status: 1,
        category: 1,
        deadline: 1,
        assignee_id: 1,
        assignee_name: 1,
        created_by: 1,
        created_by_name: 1,
        evaluation_by: 1,
        progress: 1,
        createdAt: '$createdAt',
      },
    },
  );

  if (sortBy === 'priority') {
    pipeline.push({ $sort: { priorityOrder: 1, deadline: 1, id: -1 } });
  } else {
    pipeline.push({ $sort: { deadline: 1, id: -1 } });
  }

  if (exactId) {
    pipeline.push({ $limit: 1 });
    return pipeline;
  }

  pipeline.push({ $skip: offset }, { $limit: limit });
  return pipeline;
}

async function createTask(task) {
  const refs = await resolveUserReferences(task);
  if (!refs) {
    return null;
  }

  const createdTask = await Task.create({
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    status: task.status,
    category: task.category,
    deadline: task.deadline,
    assignee: refs.assigneeUser?._id || null,
    assignee_id: refs.assigneeUser?.id || null,
    createdBy: refs.createdByUser._id,
    created_by: refs.createdByUser.id,
    evaluationBy: refs.evaluationUser?._id || null,
    evaluation_by: refs.evaluationUser?.id || null,
    progress: task.progress,
  });

  return findTaskById(createdTask.id, task.created_by);
}

async function findTasks(filters, pagination) {
  const { query, sort } = buildTaskFilters(filters);
  const [tasks, total] = await Promise.all([
    Task.aggregate(
      buildAggregatePipeline(query, {
        limit: pagination.limit,
        offset: pagination.offset,
        sortBy: filters.sortBy,
      }),
    ),
    Task.countDocuments(query),
  ]);

  return {
    tasks: tasks.map(mapTaskRow),
    total,
  };
}

async function findTaskById(id, userId) {
  const taskId = Number(id);
  const accessUserId = Number(userId);
  const pipeline = buildAggregatePipeline(
    {
      id: taskId,
      $or: [{ created_by: accessUserId }, { assignee_id: accessUserId }],
    },
    { exactId: true, sortBy: 'deadline' },
  );

  const [task] = await Task.aggregate(pipeline);
  return task ? mapTaskRow(task) : null;
}

async function updateTask(id, task, userId) {
  const refs = await resolveUserReferences({
    ...task,
    created_by: userId,
  });
  if (!refs) {
    return null;
  }

  await Task.updateOne(
    { id: Number(id), created_by: Number(userId) },
    {
      $set: {
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: task.status,
        category: task.category,
        deadline: task.deadline,
        assignee: refs.assigneeUser?._id || null,
        assignee_id: refs.assigneeUser?.id || null,
        evaluationBy: refs.evaluationUser?._id || null,
        evaluation_by: refs.evaluationUser?.id || null,
        progress: task.progress,
      },
    },
  );

  return findTaskById(id, userId);
}

async function deleteTask(id, userId) {
  const result = await Task.deleteOne({
    id: Number(id),
    created_by: Number(userId),
  });

  return result.deletedCount > 0;
}

module.exports = {
  Task,
  createTask,
  findTasks,
  findTaskById,
  updateTask,
  deleteTask,
};
