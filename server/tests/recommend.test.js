// 4. 추천 라우터 테스트
// 핵심 API: POST /api/recommend (답변 → 추천 결과)
const { app, request, login, bearer } = require('./helpers');

describe('추천 /api/recommend', () => {
  let loverToken;
  let historyId;

  beforeAll(async () => {
    loverToken = await login('lover');
  });

  test('GET /questions 설문 4문항', async () => {
    const res = await request(app).get('/api/recommend/questions');
    expect(res.status).toBe(200);
    expect(res.body.data.map((q) => q.key)).toEqual(['mood', 'season', 'category', 'purpose']);
    expect(res.body.data[0].options).toContain('고급스러운');
  });

  describe('★ POST / 추천 요청', () => {
    test('200 네 항목 모두 일치하는 MFK Baccarat Rouge 540 (100점)', async () => {
      const res = await request(app)
        .post('/api/recommend')
        .send({ mood: '고급스러운', season: '겨울', category: 'Amber', purpose: '특별한 날' });
      expect(res.status).toBe(200);
      expect(res.body.data.perfume.id).toBe('mfk-baccarat-rouge-540');
      expect(res.body.data.score).toBe(100);
      expect(res.body.data.matchedCriteria).toHaveLength(4);
      expect(res.body.data.reason).toContain('Maison Francis Kurkdjian의 Baccarat Rouge 540은(는)');
      // 비로그인은 내 기록에 저장되지 않음
      expect(res.body.data.savedToHistory).toBe(false);
    });

    test('동점이면 컬렉션 순서가 앞인 향수 (프론트와 같은 결과)', async () => {
      // Chanel Chance와 Diptyque Do Son이 둘 다 100점 → Chanel
      const res = await request(app)
        .post('/api/recommend')
        .send({ mood: '로맨틱한', season: '봄', category: 'Floral', purpose: '데이트' });
      expect(res.body.data.perfume.id).toBe('chanel-chance-eau-tendre');
    });

    test('로그인 상태면 내 추천 기록에 저장', async () => {
      const res = await request(app).post('/api/recommend').set(bearer(loverToken)).send({ category: 'Woody' });
      expect(res.status).toBe(200);
      expect(res.body.data.savedToHistory).toBe(true);
      historyId = res.body.data.historyId;
      expect(historyId).toEqual(expect.any(Number));
    });

    test('400 답변이 하나도 없음', async () => {
      const res = await request(app).post('/api/recommend').send({});
      expect(res.status).toBe(400);
    });

    test('400 보기에 없는 값', async () => {
      const res = await request(app).post('/api/recommend').send({ season: '장마철' });
      expect(res.status).toBe(400);
    });
  });

  test('GET /history 내 기록 목록 / GET /history/:id 상세', async () => {
    const list = await request(app).get('/api/recommend/history').set(bearer(loverToken));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].answers.category).toBe('Woody');

    const detail = await request(app).get(`/api/recommend/history/${historyId}`).set(bearer(loverToken));
    expect(detail.status).toBe(200);
    expect(detail.body.data.perfume.id).toBe('le-labo-santal-33');
  });

  test('남의 기록 조회 403 / 로그인 없이 401', async () => {
    const dailyToken = await login('daily');
    expect((await request(app).get(`/api/recommend/history/${historyId}`).set(bearer(dailyToken))).status).toBe(403);
    expect((await request(app).get('/api/recommend/history')).status).toBe(401);
  });

  test('GET /stats 많이 추천된 향수와 많이 고른 답변', async () => {
    const res = await request(app).get('/api/recommend/stats');
    expect(res.status).toBe(200);
    expect(res.body.data.totalCount).toBe(3);
    expect(res.body.data.topAnswers.category[0]).toEqual({ value: 'Amber', count: 1 });
  });

  test('DELETE /history/:id 삭제 후 404', async () => {
    const res = await request(app).delete(`/api/recommend/history/${historyId}`).set(bearer(loverToken));
    expect(res.status).toBe(200);
    expect((await request(app).get(`/api/recommend/history/${historyId}`).set(bearer(loverToken))).status).toBe(404);
  });
});
