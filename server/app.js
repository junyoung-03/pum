// Express 앱 설정 (라우터 연결)
// listen은 server.js에서 하고, 여기서는 app만 내보냅니다. → 테스트(supertest)에서 그대로 사용
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));

app.use('/api/users', require('./routes/users')); // 회원 (라우터 개수 제외)
app.use('/api/perfumes', require('./routes/perfumes')); // 1. 향수
app.use('/api/reviews', require('./routes/reviews')); // 2. 리뷰
app.use('/api/favorites', require('./routes/favorites')); // 3. 찜
app.use('/api/recommend', require('./routes/recommend')); // 4. 추천
app.use('/api/market', require('./routes/market')); // 5. 중고 판매글

// 없는 경로
app.use((req, res) => {
  res.status(404).json({ success: false, message: `요청한 API를 찾을 수 없습니다: ${req.method} ${req.originalUrl}` });
});

// 에러 처리 (모든 라우터의 에러가 여기로 모임)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: '요청 본문의 JSON 형식이 올바르지 않습니다.' });
  }
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ success: false, message: status === 500 ? '서버 오류가 발생했습니다.' : err.message });
});

module.exports = app;
