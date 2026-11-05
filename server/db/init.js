// DB 초기화 스크립트
//   npm run db:init       → 개발용 DB(DB_NAME) 생성 + 테이블 + 초기 데이터
//   npm run db:init:test  → 테스트용 DB(DB_NAME_TEST) 생성 + 테이블 + 초기 데이터
// 테스트 코드(tests/setup.js)도 이 함수를 불러서 매 테스트 파일마다 DB를 초기 상태로 되돌립니다.
if (process.argv.includes('--test')) process.env.NODE_ENV = 'test';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { db } = require('../config');

async function initDb({ silent = false } = {}) {
  const conn = await mysql.createConnection({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    charset: 'utf8mb4',
    multipleStatements: true,
  });

  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.query(`USE \`${db.database}\``);

    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    await conn.query(schema);
    await conn.query(seed);

    if (!silent) console.log(`[db:init] '${db.database}' 데이터베이스 초기화 완료`);
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  initDb().catch((err) => {
    console.error('[db:init] 실패:', err.message);
    process.exit(1);
  });
}

module.exports = initDb;
