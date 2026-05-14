function buildTaskFilters(filters = {}) {
  const where = [];
  const values = [];

  if (filters.search) {
    where.push('(t.title LIKE ? OR t.description LIKE ?)');
    values.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  if (filters.priority) {
    where.push('t.priority = ?');
    values.push(filters.priority);
  }

  if (filters.assigneeId) {
    where.push('t.assignee_id = ?');
    values.push(filters.assigneeId);
  }

  if (filters.accessUserId) {
    where.push('(t.created_by = ? OR t.assignee_id = ?)');
    values.push(filters.accessUserId, filters.accessUserId);
  }

  if (filters.status) {
    if (filters.status === 'pending') {
      where.push("t.status <> 'Completed'");
    } else if (filters.status === 'in progress') {
      where.push("t.status = 'In Progress'");
    } else if (filters.status === 'to do') {
      where.push("t.status = 'To Do'");
    } else if (filters.status === 'completed') {
      where.push("t.status = 'Completed'");
    } else {
      where.push('t.status = ?');
      values.push(filters.status);
    }
  }

  let orderBy = 't.deadline ASC, t.id DESC';
  if (filters.sortBy === 'priority') {
    orderBy =
      "FIELD(t.priority, 'High', 'Medium', 'Low') ASC, t.deadline ASC, t.id DESC";
  }
  if (filters.sortBy === 'deadline') {
    orderBy = 't.deadline ASC, t.id DESC';
  }

  return {
    whereClause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    values,
    orderBy,
  };
}

module.exports = { buildTaskFilters };
