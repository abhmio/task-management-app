const pool = require('../config/db');
const { buildTaskFilters } = require('../utils/queryBuilder');

function mapTaskRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    category: row.category,
    deadline: row.deadline,
    assignee_id: row.assignee_id,
    assignee_name: row.assignee_name,
    created_by: row.created_by,
    created_by_name: row.created_by_name,
    evaluation_by: row.evaluation_by,
    progress: row.progress,
    created_at: row.created_at,
  };
}

async function createTask(task) {
  const [result] = await pool.execute(
    `INSERT INTO tasks
      (title, description, priority, status, category, deadline, assignee_id, created_by, evaluation_by, progress)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      task.title,
      task.description,
      task.priority,
      task.status,
      task.category,
      task.deadline,
      task.assignee_id,
      task.created_by,
      task.evaluation_by,
      task.progress,
    ],
  );

  return findTaskById(result.insertId, task.created_by);
}

async function findTasks(filters, pagination) {
  const { whereClause, values, orderBy } = buildTaskFilters(filters);

  const [rows] = await pool.execute(
    `SELECT
      t.*,
      assignee.name AS assignee_name,
      creator.name AS created_by_name
     FROM tasks t
     LEFT JOIN users assignee ON assignee.id = t.assignee_id
     LEFT JOIN users creator ON creator.id = t.created_by
     ${whereClause}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...values, pagination.limit, pagination.offset],
  );

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM tasks t
     ${whereClause}`,
    values,
  );

  return {
    tasks: rows.map(mapTaskRow),
    total: countRows[0].total,
  };
}

async function findTaskById(id, userId) {
  const [rows] = await pool.execute(
    `SELECT
      t.*,
      assignee.name AS assignee_name,
      creator.name AS created_by_name
     FROM tasks t
     LEFT JOIN users assignee ON assignee.id = t.assignee_id
     LEFT JOIN users creator ON creator.id = t.created_by
     WHERE t.id = ?
       AND (t.created_by = ? OR t.assignee_id = ?)
     LIMIT 1`,
    [id, userId, userId],
  );

  return rows[0] ? mapTaskRow(rows[0]) : null;
}

async function updateTask(id, task, userId) {
  await pool.execute(
    `UPDATE tasks
     SET title = ?, description = ?, priority = ?, status = ?, category = ?, deadline = ?,
         assignee_id = ?, evaluation_by = ?, progress = ?
     WHERE id = ? AND created_by = ?`,
    [
      task.title,
      task.description,
      task.priority,
      task.status,
      task.category,
      task.deadline,
      task.assignee_id,
      task.evaluation_by,
      task.progress,
      id,
      userId,
    ],
  );

  return findTaskById(id, userId);
}

async function deleteTask(id, userId) {
  const [result] = await pool.execute(
    `DELETE FROM tasks
     WHERE id = ? AND created_by = ?`,
    [id, userId],
  );

  return result.affectedRows > 0;
}

module.exports = {
  createTask,
  findTasks,
  findTaskById,
  updateTask,
  deleteTask,
};
