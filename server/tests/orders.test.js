// 6. 거래 라우터 테스트
// 핵심 API: POST /api/orders (구매 신청), PATCH /api/orders/:id/receive (물품 인수), PATCH /api/orders/:id/deliver (물품 인계)
//
// 초기 데이터 (seed.sql)
//   판매글 1: 향수러버(lover)의 르라보 상탈 33, 150,000원, 판매중
//   판매글 2: 데일리향수(daily)의 조말론, 예약중 ← 거래 1 (구매자 lover, 구매신청 단계)
const { app, request, login, bearer } = require('./helpers');

describe('거래 /api/orders', () => {
  let adminToken;
  let loverToken;
  let dailyToken;
  let strangerToken;
  let orderId;

  const receiver = { name: '홍길동', phone: '010-9876-5432', address: '부산광역시 해운대구 센텀로 45, 202호' };

  beforeAll(async () => {
    adminToken = await login('admin');
    loverToken = await login('lover');
    dailyToken = await login('daily');
    // 거래와 관계없는 회원 (상세 조회 403 확인용)
    await request(app).post('/api/users/signup').send({ email: 'stranger@scentique.com', password: 'pass1234', nickname: '지나가는회원' });
    const res = await request(app).post('/api/users/login').send({ email: 'stranger@scentique.com', password: 'pass1234' });
    strangerToken = res.body.data.token;
  });

  describe('★ POST / 구매 신청', () => {
    test('201 구매 신청 → 판매글이 예약중으로 바뀜', async () => {
      const res = await request(app).post('/api/orders').set(bearer(dailyToken)).send({ postId: 1, ...receiver });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        stage: '구매신청',
        price: 150000,
        post: { id: 1, status: '예약중' },
        seller: { nickname: '향수러버' },
        buyer: { nickname: '데일리향수' },
        receiver,
      });
      orderId = res.body.data.id;

      const post = await request(app).get('/api/market/1');
      expect(post.body.data.status).toBe('예약중');
      expect(post.body.data.order).toMatchObject({ id: orderId, stage: '구매신청' });
    });

    test('409 이미 거래 중인 판매글 / 403 본인 판매글', async () => {
      expect((await request(app).post('/api/orders').set(bearer(adminToken)).send({ postId: 1, ...receiver })).status).toBe(409);
      expect((await request(app).post('/api/orders').set(bearer(loverToken)).send({ postId: 3, ...receiver })).status).toBe(403);
    });

    test('400 전화번호 형식 오류 / 주소 누락', async () => {
      const bad = await request(app).post('/api/orders').set(bearer(dailyToken)).send({ postId: 3, ...receiver, phone: '1234' });
      expect(bad.status).toBe(400);
      const { address, ...noAddress } = receiver;
      expect((await request(app).post('/api/orders').set(bearer(dailyToken)).send({ postId: 3, ...noAddress })).status).toBe(400);
    });

    test('404 없는 판매글 / 401 로그인 없음', async () => {
      expect((await request(app).post('/api/orders').set(bearer(dailyToken)).send({ postId: 999, ...receiver })).status).toBe(404);
      expect((await request(app).post('/api/orders').send({ postId: 3, ...receiver })).status).toBe(401);
    });
  });

  test('구매 신청이 들어온 판매글은 판매자가 상태 변경·수정·삭제 불가 (409)', async () => {
    expect((await request(app).patch('/api/market/1/status').set(bearer(loverToken)).send({ status: '판매중' })).status).toBe(409);
    expect((await request(app).put('/api/market/1').set(bearer(loverToken)).send({ price: 1 })).status).toBe(409);
    expect((await request(app).delete('/api/market/1').set(bearer(loverToken))).status).toBe(409);
  });

  test('GET /my 내 구매 목록 (배송 정보 포함) / GET /sales 내 판매 거래 (구매자 개인정보 없음)', async () => {
    const my = await request(app).get('/api/orders/my').set(bearer(dailyToken));
    expect(my.status).toBe(200);
    expect(my.body.data.find((o) => o.id === orderId).receiver).toEqual(receiver);

    const sales = await request(app).get('/api/orders/sales').set(bearer(loverToken));
    expect(sales.status).toBe(200);
    const sale = sales.body.data.find((o) => o.id === orderId);
    expect(sale.buyer.nickname).toBe('데일리향수');
    expect(sale.receiver).toBeNull();
  });

  test('GET /:id 상세 → 판매자는 개인정보 없음, 구매자·관리자는 있음, 관계없는 회원 403', async () => {
    expect((await request(app).get(`/api/orders/${orderId}`).set(bearer(loverToken))).body.data.receiver).toBeNull();
    expect((await request(app).get(`/api/orders/${orderId}`).set(bearer(dailyToken))).body.data.receiver).toEqual(receiver);
    expect((await request(app).get(`/api/orders/${orderId}`).set(bearer(adminToken))).body.data.receiver).toEqual(receiver);
    expect((await request(app).get(`/api/orders/${orderId}`).set(bearer(strangerToken))).status).toBe(403);
    expect((await request(app).get('/api/orders/999').set(bearer(adminToken))).status).toBe(404);
  });

  test('PATCH /:id/ship 판매자 발송 → 구매자는 403, 판매자 200 (판매자발송)', async () => {
    expect((await request(app).patch(`/api/orders/${orderId}/ship`).set(bearer(dailyToken))).status).toBe(403);
    const res = await request(app).patch(`/api/orders/${orderId}/ship`).set(bearer(loverToken));
    expect(res.status).toBe(200);
    expect(res.body.data.stage).toBe('판매자발송');
    expect(res.body.data.shippedAt).not.toBeNull();
    // 다시 발송하면 409
    expect((await request(app).patch(`/api/orders/${orderId}/ship`).set(bearer(loverToken))).status).toBe(409);
  });

  test('DELETE /:id 판매자가 발송한 뒤에는 구매 취소 불가 (409)', async () => {
    expect((await request(app).delete(`/api/orders/${orderId}`).set(bearer(dailyToken))).status).toBe(409);
  });

  describe('★ PATCH /:id/receive 물품 인수 (관리자)', () => {
    test('403 일반 회원은 인수 처리 불가', async () => {
      expect((await request(app).patch(`/api/orders/${orderId}/receive`).set(bearer(loverToken))).status).toBe(403);
    });

    test('409 판매자가 아직 발송하지 않은 거래 (거래 1: 구매신청 단계)', async () => {
      expect((await request(app).patch('/api/orders/1/receive').set(bearer(adminToken))).status).toBe(409);
    });

    test('200 인수 확인 → 인수완료', async () => {
      const res = await request(app).patch(`/api/orders/${orderId}/receive`).set(bearer(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.data.stage).toBe('인수완료');
      expect(res.body.data.receivedAt).not.toBeNull();
    });
  });

  describe('★ PATCH /:id/deliver 물품 인계 (관리자)', () => {
    test('403 일반 회원은 인계 처리 불가', async () => {
      expect((await request(app).patch(`/api/orders/${orderId}/deliver`).set(bearer(dailyToken))).status).toBe(403);
    });

    test('200 구매자에게 발송 → 인계완료 + 판매글 판매완료', async () => {
      const res = await request(app).patch(`/api/orders/${orderId}/deliver`).set(bearer(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ stage: '인계완료', post: { status: '판매완료' }, receiver });
      expect((await request(app).get('/api/market/1')).body.data.status).toBe('판매완료');
    });

    test('409 이미 인계한 거래 / 인수 전 거래', async () => {
      expect((await request(app).patch(`/api/orders/${orderId}/deliver`).set(bearer(adminToken))).status).toBe(409);
      expect((await request(app).patch('/api/orders/1/deliver').set(bearer(adminToken))).status).toBe(409);
    });
  });

  test('GET / 관리자 전체 목록 + stage 필터, 일반 회원 403, 잘못된 stage 400', async () => {
    const all = await request(app).get('/api/orders').set(bearer(adminToken));
    expect(all.status).toBe(200);
    expect(all.body.data).toHaveLength(2);

    const waiting = await request(app).get('/api/orders').query({ stage: '구매신청' }).set(bearer(adminToken));
    expect(waiting.body.data.map((o) => o.id)).toEqual([1]);

    expect((await request(app).get('/api/orders').set(bearer(loverToken))).status).toBe(403);
    expect((await request(app).get('/api/orders').query({ stage: '배송중' }).set(bearer(adminToken))).status).toBe(400);
  });

  test('DELETE /:id 구매 취소 → 남의 거래 403, 구매자 취소 200 후 판매글 판매중', async () => {
    expect((await request(app).delete('/api/orders/1').set(bearer(dailyToken))).status).toBe(403);
    const res = await request(app).delete('/api/orders/1').set(bearer(loverToken));
    expect(res.status).toBe(200);
    const post = await request(app).get('/api/market/2');
    expect(post.body.data.status).toBe('판매중');
    expect(post.body.data.order).toBeNull();
  });

  // ===== 관리자 되돌리기 (이 시점: 거래 orderId = 인계완료, 판매글 1 = 판매완료) =====
  describe('관리자 되돌리기: 인계 취소 · 인수 취소 · 거래 취소', () => {
    test('DELETE /:id/deliver 인계 취소 → 인수완료 + 판매글 예약중, 일반 회원 403', async () => {
      expect((await request(app).delete(`/api/orders/${orderId}/deliver`).set(bearer(loverToken))).status).toBe(403);
      const res = await request(app).delete(`/api/orders/${orderId}/deliver`).set(bearer(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ stage: '인수완료', deliveredAt: null, post: { status: '예약중' } });
      // 이미 되돌렸으면 409
      expect((await request(app).delete(`/api/orders/${orderId}/deliver`).set(bearer(adminToken))).status).toBe(409);
    });

    test('DELETE /:id/receive 인수 취소 → 판매자발송, 다시 취소하면 409', async () => {
      const res = await request(app).delete(`/api/orders/${orderId}/receive`).set(bearer(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ stage: '판매자발송', receivedAt: null });
      expect((await request(app).delete(`/api/orders/${orderId}/receive`).set(bearer(adminToken))).status).toBe(409);
    });

    test('DELETE /:id 관리자 거래 취소 → 판매자는 403, 발송 후 구매자는 409, 관리자 200 → 판매글 판매중', async () => {
      expect((await request(app).delete(`/api/orders/${orderId}`).set(bearer(loverToken))).status).toBe(403);
      expect((await request(app).delete(`/api/orders/${orderId}`).set(bearer(dailyToken))).status).toBe(409);

      const res = await request(app).delete(`/api/orders/${orderId}`).set(bearer(adminToken));
      expect(res.status).toBe(200);
      const post = await request(app).get('/api/market/1');
      expect(post.body.data).toMatchObject({ status: '판매중', order: null });
      expect((await request(app).get(`/api/orders/${orderId}`).set(bearer(adminToken))).status).toBe(404);
    });

    test('취소된 판매글은 다시 구매 가능, 인계까지 끝난 거래는 관리자도 바로 취소 불가 (409)', async () => {
      const buy = await request(app).post('/api/orders').set(bearer(dailyToken)).send({ postId: 1, ...receiver });
      expect(buy.status).toBe(201);
      const id = buy.body.data.id;
      await request(app).patch(`/api/orders/${id}/ship`).set(bearer(loverToken));
      await request(app).patch(`/api/orders/${id}/receive`).set(bearer(adminToken));
      await request(app).patch(`/api/orders/${id}/deliver`).set(bearer(adminToken));
      expect((await request(app).delete(`/api/orders/${id}`).set(bearer(adminToken))).status).toBe(409);
    });
  });
});
