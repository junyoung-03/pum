// 환경 변수 설정 (.env 파일에서 읽음)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const isTest = process.env.NODE_ENV === 'test';

module.exports = {
  isTest,
  port: Number(process.env.PORT) || 4000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    // 테스트 실행 시에는 실제 데이터와 분리된 테스트용 DB를 사용
    database: isTest
      ? process.env.DB_NAME_TEST || `${process.env.DB_NAME || 'scentique'}_test`
      : process.env.DB_NAME || 'scentique',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'scentique-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
  },
};
