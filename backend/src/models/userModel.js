const pool = require('../config/db');

async function createUser({ name, email, password, role = 'user' }) {
  const [result] = await pool.execute(
    `INSERT INTO users (name, email, password, role)
     VALUES (?, ?, ?, ?)`,
    [name, email, password, role],
  );

  return findById(result.insertId);
}

async function findByEmail(email) {
  const [rows] = await pool.execute(
    `SELECT id, name, email, password, role, created_at,
            reset_token, reset_token_expiry,
            CASE WHEN password IS NULL OR password = '' THEN 0 ELSE 1 END AS has_password
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email],
  );

  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT id, name, email, role, created_at,
            reset_token, reset_token_expiry,
            CASE WHEN password IS NULL OR password = '' THEN 0 ELSE 1 END AS has_password
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] || null;
}

async function updatePasswordById(id, password) {
  await pool.execute(
    `UPDATE users
     SET password = ?, reset_token = NULL, reset_token_expiry = NULL
     WHERE id = ?`,
    [password, id],
  );

  return findById(id);
}

async function updatePasswordByEmail(email, password) {
  const [result] = await pool.execute(
    `UPDATE users
     SET password = ?, reset_token = NULL, reset_token_expiry = NULL
     WHERE email = ?`,
    [password, email],
  );

  if (!result.affectedRows) {
    return null;
  }

  return findByEmail(email);
}

async function saveResetToken(userId, resetToken, resetTokenExpiry) {
  await pool.execute(
    `UPDATE users
     SET reset_token = ?, reset_token_expiry = ?
     WHERE id = ?`,
    [resetToken, resetTokenExpiry, userId],
  );
}

async function clearResetToken(userId) {
  await pool.execute(
    `UPDATE users
     SET reset_token = NULL, reset_token_expiry = NULL
     WHERE id = ?`,
    [userId],
  );
}

async function findByResetToken(resetToken) {
  const [rows] = await pool.execute(
    `SELECT id, name, email, password, role, created_at,
            reset_token, reset_token_expiry,
            CASE WHEN password IS NULL OR password = '' THEN 0 ELSE 1 END AS has_password
     FROM users
     WHERE reset_token = ?
       AND reset_token_expiry IS NOT NULL
       AND reset_token_expiry > NOW()
     LIMIT 1`,
    [resetToken],
  );

  return rows[0] || null;
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  updatePasswordById,
  updatePasswordByEmail,
  saveResetToken,
  clearResetToken,
  findByResetToken,
};
