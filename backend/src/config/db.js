const mysql = require('mysql2/promise');
const { env } = require('./env');

const pool = mysql.createPool(env.db);

module.exports = pool;
