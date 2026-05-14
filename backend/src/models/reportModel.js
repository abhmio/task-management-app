const pool = require('../config/db');

async function getWeeklyReport(userId) {
  const [rows] = await pool.execute(
    `SELECT
      DAYNAME(deadline) AS day_name,
      COUNT(*) AS task_count,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_count
     FROM tasks
     WHERE (created_by = ? OR assignee_id = ?)
       AND YEARWEEK(deadline, 1) = YEARWEEK(CURDATE(), 1)
     GROUP BY DAYOFWEEK(deadline), DAYNAME(deadline)
     ORDER BY DAYOFWEEK(deadline)`,
    [userId, userId],
  );

  return rows;
}

async function getStatusDistribution(userId) {
  const [rows] = await pool.execute(
    `SELECT status, COUNT(*) AS total
     FROM tasks
     WHERE created_by = ? OR assignee_id = ?
     GROUP BY status`,
    [userId, userId],
  );

  return rows;
}

async function getCategoryAnalysis(userId) {
  const [rows] = await pool.execute(
    `SELECT category, COUNT(*) AS total
     FROM tasks
     WHERE created_by = ? OR assignee_id = ?
     GROUP BY category`,
    [userId, userId],
  );

  return rows;
}

async function getProductivity(userId) {
  const [rows] = await pool.execute(
    `SELECT
      COUNT(*) AS total_tasks,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_tasks,
      SUM(CASE WHEN status <> 'Completed' AND deadline < CURDATE() THEN 1 ELSE 0 END) AS overdue_tasks
     FROM tasks
     WHERE created_by = ? OR assignee_id = ?`,
    [userId, userId],
  );

  return rows[0];
}

module.exports = {
  getWeeklyReport,
  getStatusDistribution,
  getCategoryAnalysis,
  getProductivity,
};
