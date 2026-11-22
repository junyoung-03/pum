// 서버 실행 파일 (npm start / npm run dev)
const app = require('./app');
const { port } = require('./config');
const { sequelize } = require('./models');

// Sequelize DB 연결 및 서버 기동 (step3/step4 스타일)
sequelize
  .sync({ force: false })
  .then(() => {
    console.log('데이터베이스 연결 성공');
    app.listen(port, () => {
      console.log(`SCENTIQUE API 서버 실행 중: http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('데이터베이스 연결 실패:', err);
  });
