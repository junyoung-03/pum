// Express 앱 설정 (미들웨어 설정과 라우터 연결)
// listen은 server.js에서 하고, 여기서는 app만 내보냅니다. → 테스트(supertest)에서 그대로 사용
const express = require('express');
const cors = require('cors');
const path = require('path');

const usersRouter = require('./routes/users');
const perfumesRouter = require('./routes/perfumes');
const reviewsRouter = require('./routes/reviews');
const favoritesRouter = require('./routes/favorites');
const recommendRouter = require('./routes/recommend');
const marketRouter = require('./routes/market');
const ordersRouter = require('./routes/orders');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// [시스템 API] 서버 가동 및 헬스체크 확인
app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));

app.use('/api/users', usersRouter); // 회원 (라우터 개수 제외)
app.use('/api/perfumes', perfumesRouter); // 1. 향수
app.use('/api/reviews', reviewsRouter); // 2. 리뷰
app.use('/api/favorites', favoritesRouter); // 3. 찜
app.use('/api/recommend', recommendRouter); // 4. 추천
app.use('/api/market', marketRouter); // 5. 중고 판매글
app.use('/api/orders', ordersRouter); // 6. 거래 (관리자 중개 안전거래)

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
  // 모델의 중복 제약(unique)·값 범위(validate) 위반
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ success: false, message: '이미 등록된 값입니다.' });
  }
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({ success: false, message: '입력값이 올바르지 않습니다.' });
  }
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ success: false, message: status === 500 ? '서버 오류가 발생했습니다.' : err.message });
});

module.exports = app;
