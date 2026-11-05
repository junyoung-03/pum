// 3. 찜 라우터 테스트
// 핵심 API: POST /api/favorites/:perfumeId (찜 추가), DELETE /api/favorites/:perfumeId (찜 해제)
const { app, request, login, bearer } = require('./helpers');

describe('찜 /api/favorites', () => {
  let token;

  beforeAll(async () => {
    token = await login('daily'); // seed: mfk-baccarat-rouge-540, jo-malone-english-pear 찜 상태
  });

  describe('★ POST /:perfumeId 찜 추가', () => {
    test('201 찜 추가', async () => {
      const res = await request(app).post('/api/favorites/dior-sauvage-edp').set(bearer(token));
      expect(res.status).toBe(201);
      expect(res.body.data).toEqual({ perfumeId: 'dior-sauvage-edp', isFavorite: true });
    });

    test('409 같은 향수 다시 찜', async () => {
      const res = await request(app).post('/api/favorites/dior-sauvage-edp').set(bearer(token));
      expect(res.status).toBe(409);
    });

    test('404 없는 향수 / 401 로그인 없음', async () => {
      expect((await request(app).post('/api/favorites/no-such-perfume').set(bearer(token))).status).toBe(404);
      expect((await request(app).post('/api/favorites/dior-sauvage-edp')).status).toBe(401);
    });
  });

  test('GET / 내 찜 목록에 방금 추가한 향수 포함 (총 3개)', async () => {
    const res = await request(app).get('/api/favorites').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data.map((p) => p.id)).toContain('dior-sauvage-edp');
  });

  test('GET /:perfumeId/check 찜 여부', async () => {
    const yes = await request(app).get('/api/favorites/dior-sauvage-edp/check').set(bearer(token));
    expect(yes.body.data.isFavorite).toBe(true);
    const no = await request(app).get('/api/favorites/tom-ford-oud-wood/check').set(bearer(token));
    expect(no.body.data.isFavorite).toBe(false);
  });

  test('GET /ranking 찜 많은 순 (MFK가 2명으로 1위)', async () => {
    const res = await request(app).get('/api/favorites/ranking');
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({ rank: 1, id: 'mfk-baccarat-rouge-540', favoriteCount: 2 });
  });

  describe('★ DELETE /:perfumeId 찜 해제', () => {
    test('200 찜 해제 후 check는 false', async () => {
      const res = await request(app).delete('/api/favorites/dior-sauvage-edp').set(bearer(token));
      expect(res.status).toBe(200);
      expect(res.body.data.isFavorite).toBe(false);
      const check = await request(app).get('/api/favorites/dior-sauvage-edp/check').set(bearer(token));
      expect(check.body.data.isFavorite).toBe(false);
    });

    test('404 찜하지 않은 향수 해제', async () => {
      const res = await request(app).delete('/api/favorites/dior-sauvage-edp').set(bearer(token));
      expect(res.status).toBe(404);
    });
  });

  test('DELETE / 전체 비우기', async () => {
    const res = await request(app).delete('/api/favorites').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data.deletedCount).toBe(2);
    const list = await request(app).get('/api/favorites').set(bearer(token));
    expect(list.body.data).toHaveLength(0);
  });
});
