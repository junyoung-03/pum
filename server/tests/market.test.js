// 5. 중고 판매글 라우터 테스트
// 핵심 API: POST /api/market (판매글 등록)
const { app, request, login, bearer } = require('./helpers');

describe('중고 판매글 /api/market', () => {
  let loverToken;
  let dailyToken;
  let postId;

  beforeAll(async () => {
    loverToken = await login('lover');
    dailyToken = await login('daily');
  });

  describe('★ POST / 판매글 등록', () => {
    test('201 등록 + perfumeId로 브랜드·계열 자동 입력', async () => {
      const res = await request(app).post('/api/market').set(bearer(dailyToken)).send({
        title: '톰포드 오드우드 50ml 잔량 70%',
        perfumeId: 'tom-ford-oud-wood',
        volumeMl: 50,
        remainPercent: 70,
        price: 180000,
        content: '정품, 박스 없음',
      });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        brand: 'TOM FORD',
        category: 'Woody',
        status: '판매중',
        seller: { nickname: '데일리향수' },
      });
      postId = res.body.data.id;
    });

    test('201 컬렉션에 없는 향수는 brand 직접 입력', async () => {
      const res = await request(app).post('/api/market').set(bearer(dailyToken)).send({
        title: '아쿠아 디 파르마 미니어처',
        brand: 'ACQUA DI PARMA',
        volumeMl: 5,
        remainPercent: 100,
        price: 15000,
      });
      expect(res.status).toBe(201);
      expect(res.body.data.perfumeId).toBeNull();
    });

    test('400 잔량 범위 오류 (0%) / 가격 누락', async () => {
      const base = { title: '테스트', brand: 'TEST', volumeMl: 30, remainPercent: 50, price: 10000 };
      expect((await request(app).post('/api/market').set(bearer(dailyToken)).send({ ...base, remainPercent: 0 })).status).toBe(400);
      const { price, ...noPrice } = base;
      expect((await request(app).post('/api/market').set(bearer(dailyToken)).send(noPrice)).status).toBe(400);
    });

    test('400 brand도 perfumeId도 없음 / 401 로그인 없음', async () => {
      const body = { title: '테스트', volumeMl: 30, remainPercent: 50, price: 10000 };
      expect((await request(app).post('/api/market').set(bearer(dailyToken)).send(body)).status).toBe(400);
      expect((await request(app).post('/api/market').send({ ...body, brand: 'TEST' })).status).toBe(401);
    });
  });

  test('GET / 목록 필터: 판매중 + 가격 10만원 이상, 가격 높은 순', async () => {
    const res = await request(app)
      .get('/api/market')
      .query({ status: '판매중', minPrice: 100000, sort: 'priceDesc' });
    expect(res.status).toBe(200);
    expect(res.body.data.map((p) => p.price)).toEqual([180000, 150000]);
  });

  test('GET /my 내 판매글 / GET /:id 상세', async () => {
    const my = await request(app).get('/api/market/my').set(bearer(dailyToken));
    expect(my.status).toBe(200);
    my.body.data.forEach((p) => expect(p.seller.nickname).toBe('데일리향수'));

    const detail = await request(app).get(`/api/market/${postId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.remainPercent).toBe(70);
  });

  test('PUT /:id → 남의 글 403, 본인 수정 200', async () => {
    expect((await request(app).put(`/api/market/${postId}`).set(bearer(loverToken)).send({ price: 1 })).status).toBe(403);
    const res = await request(app).put(`/api/market/${postId}`).set(bearer(dailyToken)).send({ price: 170000 });
    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe(170000);
  });

  test('PATCH /:id/status → 예약중 변경 200, 잘못된 상태 400, 남의 글 403', async () => {
    const res = await request(app).patch(`/api/market/${postId}/status`).set(bearer(dailyToken)).send({ status: '예약중' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('예약중');
    expect((await request(app).patch(`/api/market/${postId}/status`).set(bearer(dailyToken)).send({ status: '보류' })).status).toBe(400);
    expect((await request(app).patch(`/api/market/${postId}/status`).set(bearer(loverToken)).send({ status: '판매완료' })).status).toBe(403);
  });

  test('DELETE /:id → 본인 삭제 200 후 404', async () => {
    const res = await request(app).delete(`/api/market/${postId}`).set(bearer(dailyToken));
    expect(res.status).toBe(200);
    expect((await request(app).get(`/api/market/${postId}`)).status).toBe(404);
  });
});
