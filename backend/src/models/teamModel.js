const pool = require('../config/db');

async function createTeam({ name, description, created_by }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [teamResult] = await connection.execute(
      `INSERT INTO teams (name, description, created_by)
       VALUES (?, ?, ?)`,
      [name, description, created_by],
    );

    await connection.execute(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES (?, ?, 'admin')`,
      [teamResult.insertId, created_by],
    );

    await connection.commit();
    return findTeamById(teamResult.insertId, created_by);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function findTeamsForUser(userId) {
  const [rows] = await pool.execute(
    `SELECT DISTINCT
      t.id,
      t.name,
      t.description,
      t.created_by,
      t.created_at,
      tm.role AS membership_role,
      creator.name AS created_by_name,
      COUNT(all_members.user_id) AS member_count
     FROM teams t
     INNER JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = ?
     LEFT JOIN team_members all_members ON all_members.team_id = t.id
     LEFT JOIN users creator ON creator.id = t.created_by
     GROUP BY t.id, tm.role, creator.name
     ORDER BY t.created_at DESC`,
    [userId],
  );

  return rows;
}

async function findTeamById(teamId, userId) {
  const [teamRows] = await pool.execute(
    `SELECT
      t.id,
      t.name,
      t.description,
      t.created_by,
      t.created_at,
      creator.name AS created_by_name
     FROM teams t
     INNER JOIN team_members membership
       ON membership.team_id = t.id AND membership.user_id = ?
     LEFT JOIN users creator ON creator.id = t.created_by
     WHERE t.id = ?
     LIMIT 1`,
    [userId, teamId],
  );

  if (!teamRows[0]) {
    return null;
  }

  const [memberRows] = await pool.execute(
    `SELECT
      tm.team_id,
      tm.user_id,
      tm.role,
      u.name,
      u.email,
      u.created_at
     FROM team_members tm
     INNER JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = ?
     ORDER BY tm.created_at ASC`,
    [teamId],
  );

  return {
    ...teamRows[0],
    members: memberRows,
  };
}

async function findTeamMembership(teamId, userId) {
  const [rows] = await pool.execute(
    `SELECT team_id, user_id, role
     FROM team_members
     WHERE team_id = ? AND user_id = ?
     LIMIT 1`,
    [teamId, userId],
  );

  return rows[0] || null;
}

async function addMember({ teamId, userId, role }) {
  await pool.execute(
    `INSERT INTO team_members (team_id, user_id, role)
     VALUES (?, ?, ?)`,
    [teamId, userId, role],
  );
}

module.exports = {
  createTeam,
  findTeamsForUser,
  findTeamById,
  findTeamMembership,
  addMember,
};
