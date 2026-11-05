// 1. 향수 라우터 테스트
// 핵심 API: GET /api/perfumes (목록·필터), GET /api/perfumes/:id (상세)
const { app, request, login, bearer } = require('./helpers');

describe('향수 /api/perfumes', () => {
  describe('★ GET / 목록 조회', () => {
    test('200 + 전체 8종 + 페이지 정보', async () => {
      const res = await request(app).get('/api/perfumes');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(8);
      expect(res.body.pagination).toMatchObject({ page: 1, total: 8 });
    });

    test('category 필터: Woody만 조회', async () => {
      const res = await request(app).get('/api/perfumes').query({ category: 'Woody' });
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach((p) => expect(p.category).toBe('Woody'));
    });

    test('mood + season 필터 (JSON 배열 검색)', async () => {
      const res = await request(app).get('/api/perfumes').query({ mood: '로맨틱한', season: '봄' });
      expect(res.status).toBe(200);
      res.body.data.forEach((p) => {
        expect(p.mood).toContain('로맨틱한');
        expect(p.season).toContain('봄');
      });
    });

    test('q 검색: 브랜드명으로 검색', async () => {
      const res = await request(app).get('/api/perfumes').query({ q: 'chanel' });
      expect(res.status).toBe(200);
      expect(res.body.data.map((p) => p.id)).toEqual(['chanel-chance-eau-tendre']);
    });

    test('400 잘못된 category', async () => {
      const res = await request(app).get('/api/perfumes').query({ category: 'Fruity' });
      expect(res.status).toBe(400);
    });
  });

  describe('★ GET /:id 상세 조회', () => {
    test('200 + 노트 정보 포함', async () => {
      const res = await request(app).get('/api/perfumes/le-labo-santal-33');
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: 'le-labo-santal-33', brand: 'LE LABO', category: 'Woody' });
      expect(Array.isArray(res.body.data.topNote)).toBe(true);
    });

    test('404 없는 향수', async () => {
      const res = await request(app).get('/api/perfumes/no-such-perfume');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /featured 대표 향수', () => {
    test('200 + 3개 + 지정된 순서(Dior → Chanel → Jo Malone)', async () => {
      const res = await request(app).get('/api/perfumes/featured');
      expect(res.status).toBe(200);
      expect(res.body.data.map((p) => p.id)).toEqual([
        'dior-sauvage-edp',
        'chanel-chance-eau-tendre',
        'jo-malone-english-pear',
      ]);
    });
  });

  describe('GET /:id/similar 비슷한 향수', () => {
    test('Santal 33 기준 → Tom Ford(7점), Dior(3점), MFK(3점)', async () => {
      const res = await request(app).get('/api/perfumes/le-labo-santal-33/similar');
      expect(res.status).toBe(200);
      expect(res.body.data.map((p) => [p.id, p.similarity])).toEqual([
        ['tom-ford-oud-wood', 7],
        ['dior-sauvage-edp', 3],
        ['mfk-baccarat-rouge-540', 3],
      ]);
    });

    test('결과에 기준 향수 자신은 없음 + limit 적용', async () => {
      const res = await request(app).get('/api/perfumes/le-labo-santal-33/similar').query({ limit: 7 });
      expect(res.body.data).toHaveLength(7);
      expect(res.body.data.map((p) => p.id)).not.toContain('le-labo-santal-33');
    });

    test('400 잘못된 limit / 404 없는 향수', async () => {
      expect((await request(app).get('/api/perfumes/le-labo-santal-33/similar?limit=abc')).status).toBe(400);
      expect((await request(app).get('/api/perfumes/no-such-perfume/similar')).status).toBe(404);
    });
  });

  describe('관리자 등록·수정·삭제', () => {
    const newPerfume = {
      id: 'test-perfume',
      name: 'Test Eau',
      brand: 'TEST',
      category: 'Citrus',
      mood: ['상큼한'],
      season: ['여름'],
    };

    test('POST / → 403 일반 회원은 등록 불가', async () => {
      const token = await login('lover');
      const res = await request(app).post('/api/perfumes').set(bearer(token)).send(newPerfume);
      expect(res.status).toBe(403);
    });

    test('POST / → 201 관리자 등록, PUT → 200 수정, DELETE → 200 삭제', async () => {
      const token = await login('admin');
      const created = await request(app).post('/api/perfumes').set(bearer(token)).send(newPerfume);
      expect(created.status).toBe(201);
      expect(created.body.data.mood).toEqual(['상큼한']);

      const dup = await request(app).post('/api/perfumes').set(bearer(token)).send(newPerfume);
      expect(dup.status).toBe(409);

      const updated = await request(app)
        .put('/api/perfumes/test-perfume')
        .set(bearer(token))
        .send({ featured: true, featuredOrder: 4 });
      expect(updated.status).toBe(200);
      expect(updated.body.data.featured).toBe(true);

      const removed = await request(app).delete('/api/perfumes/test-perfume').set(bearer(token));
      expect(removed.status).toBe(200);
      expect((await request(app).get('/api/perfumes/test-perfume')).status).toBe(404);
    });
  });
});
