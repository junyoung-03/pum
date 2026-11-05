// 서버 실행 파일 (npm start / npm run dev)
const app = require('./app');
const { port } = require('./config');

app.listen(port, () => {
  console.log(`SCENTIQUE API 서버 실행 중: http://localhost:${port}`);
});
