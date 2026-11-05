// MySQL 커넥션 풀 (모든 라우터가 이 pool로 쿼리를 실행)
const mysql = require('mysql2/promise');
const { db } = require('../config');

const pool = mysql.createPool({
  host: db.host,
  port: db.port,
  user: db.user,
  password: db.password,
  database: db.database,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
