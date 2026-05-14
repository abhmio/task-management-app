const pool = require('../config/db');

async function getDashboardSummary(userId) {
  const [rows] = await pool.execute(
    `SELECT
      COUNT(*) AS total_tasks,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_tasks,
      SUM(CASE WHEN status <> 'Completed' THEN 1 ELSE 0 END) AS pending_tasks,
      SUM(CASE WHEN status <> 'Completed' AND deadline < CURDATE() THEN 1 ELSE 0 END) AS overdue_tasks
     FROM tasks
     WHERE created_by = ? OR assignee_id = ?`,
    [userId, userId],
  );

  return rows[0];
}

module.exports = { getDashboardSummary };
