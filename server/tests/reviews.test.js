ㅈ// 2. 리뷰 라우터 테스트
// 핵심 API: POST /api/reviews (리뷰 작성)
const { app, request, login, bearer } = require('./helpers');

describe('리뷰 /api/reviews', () => {
  let loverToken;
  let dailyToken;
  let reviewId;

  beforeAll(async () => {
    loverToken = await login('lover');
    dailyToken = await login('daily');
  });

  describe('★ POST / 리뷰 작성', () => {
    test('201 작성 성공 + 작성자 닉네임 자동 입력', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set(bearer(loverToken))
        .send({ perfumeId: 'tom-ford-oud-wood', rating: 4, content: '깊고 따뜻한 우디 향이에요.' });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        perfumeId: 'tom-ford-oud-wood',
        perfumeName: 'TOM FORD Oud Wood',
        authorName: '향수러버',
        rating: 4,
      });
      reviewId = res.body.data.id;
    });

    test('401 로그인 없이 작성', async () => {
      const res = await request(app).post('/api/reviews').send({ perfumeId: 'tom-ford-oud-wood', rating: 5, content: '좋아요' });
      expect(res.status).toBe(401);
    });

    test('400 별점 범위 초과 (6점)', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set(bearer(loverToken))
        .send({ perfumeId: 'tom-ford-oud-wood', rating: 6, content: '좋아요' });
      expect(res.status).toBe(400);
    });

    test('400 내용 없음', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set(bearer(loverToken))
        .send({ perfumeId: 'tom-ford-oud-wood', rating: 5, content: '   ' });
      expect(res.status).toBe(400);
    });

    test('404 없는 향수', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set(bearer(loverToken))
        .send({ perfumeId: 'no-such-perfume', rating: 5, content: '좋아요' });
      expect(res.status).toBe(404);
    });
  });

  test('GET / 목록: 향수별 필터 + 최신순 첫 번째가 방금 쓴 리뷰', async () => {
    const res = await request(app).get('/api/reviews').query({ perfumeId: 'tom-ford-oud-wood' });
    expect(res.status).toBe(200);
    expect(res.body.data[0].id).toBe(reviewId);
    res.body.data.forEach((r) => expect(r.perfumeId).toBe('tom-ford-oud-wood'));
  });

  test('GET /stats/:perfumeId 평균 별점과 분포', async () => {
    await request(app)
      .post('/api/reviews')
      .set(bearer(dailyToken))
      .send({ perfumeId: 'tom-ford-oud-wood', rating: 5, content: '고급스러워요.' });
    const res = await request(app).get('/api/reviews/stats/tom-ford-oud-wood');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ reviewCount: 2, averageRating: 4.5 });
    expect(res.body.data.distribution).toMatchObject({ 4: 1, 5: 1 });
  });

  test('GET /:id 상세 → 200, 없는 리뷰 → 404', async () => {
    expect((await request(app).get(`/api/reviews/${reviewId}`)).status).toBe(200);
    expect((await request(app).get('/api/reviews/99999')).status).toBe(404);
  });

  test('PUT /:id → 남의 리뷰는 403, 본인은 200', async () => {
    const other = await request(app).put(`/api/reviews/${reviewId}`).set(bearer(dailyToken)).send({ rating: 1 });
    expect(other.status).toBe(403);
    const mine = await request(app).put(`/api/reviews/${reviewId}`).set(bearer(loverToken)).send({ rating: 5 });
    expect(mine.status).toBe(200);
    expect(mine.body.data.rating).toBe(5);
  });

  test('DELETE /:id → 본인 삭제 200 후 조회 404', async () => {
    const res = await request(app).delete(`/api/reviews/${reviewId}`).set(bearer(loverToken));
    expect(res.status).toBe(200);
    expect((await request(app).get(`/api/reviews/${reviewId}`)).status).toBe(404);
  });
});
