function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildTaskFilters(filters = {}) {
  const query = {};

  if (filters.search) {
    const pattern = new RegExp(escapeRegex(filters.search.trim()), 'i');
    query.$or = [{ title: pattern }, { description: pattern }];
  }

  if (filters.priority) {
    query.priority = filters.priority;
  }

  if (filters.assigneeId) {
    query.assignee_id = Number(filters.assigneeId);
  }

  if (filters.accessUserId) {
    query.$and = [
      ...(query.$and || []),
      {
        $or: [
          { created_by: Number(filters.accessUserId) },
          { assignee_id: Number(filters.accessUserId) },
        ],
      },
    ];
  }

  if (filters.status) {
    if (filters.status === 'pending') {
      query.status = { $ne: 'Completed' };
    } else if (filters.status === 'in progress') {
      query.status = 'In Progress';
    } else if (filters.status === 'to do') {
      query.status = 'To Do';
    } else if (filters.status === 'completed') {
      query.status = 'Completed';
    } else {
      query.status = filters.status;
    }
  }

  let sort = { deadline: 1, id: -1 };
  if (filters.sortBy === 'priority') {
    sort = { priorityOrder: 1, deadline: 1, id: -1 };
  }

  return {
    query,
    sort,
  };
}

module.exports = { buildTaskFilters };
