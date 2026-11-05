// 회원 라우터 테스트 (라우터 개수 제외지만 다른 라우터의 로그인 기능이 여기에 의존)
const { app, request, bearer } = require('./helpers');

describe('회원 /api/users', () => {
  const newUser = { email: 'newbie@scentique.com', password: 'pass1234', nickname: '새회원' };
  let token;

  test('POST /signup → 201 회원가입', async () => {
    const res = await request(app).post('/api/users/signup').send(newUser);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ email: newUser.email, nickname: newUser.nickname, role: 'user' });
    expect(res.body.data.password).toBeUndefined();
  });

  test('POST /signup → 409 이미 가입된 이메일', async () => {
    const res = await request(app).post('/api/users/signup').send({ ...newUser, nickname: '다른닉네임' });
    expect(res.status).toBe(409);
  });

  test('POST /signup → 400 이메일 형식 오류', async () => {
    const res = await request(app).post('/api/users/signup').send({ ...newUser, email: 'not-email' });
    expect(res.status).toBe(400);
  });

  test('POST /login → 200 토큰 발급', async () => {
    const res = await request(app).post('/api/users/login').send({ email: newUser.email, password: newUser.password });
    expect(res.status).toBe(200);
    expect(typeof res.body.data.token).toBe('string');
    token = res.body.data.token;
  });

  test('POST /login → 401 비밀번호 틀림', async () => {
    const res = await request(app).post('/api/users/login').send({ email: newUser.email, password: 'wrong-pw' });
    expect(res.status).toBe(401);
  });

  test('GET /me → 200 내 정보', async () => {
    const res = await request(app).get('/api/users/me').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data.nickname).toBe(newUser.nickname);
  });

  test('PUT /me → 200 닉네임 수정', async () => {
    const res = await request(app).put('/api/users/me').set(bearer(token)).send({ nickname: '바뀐닉네임' });
    expect(res.status).toBe(200);
    expect(res.body.data.nickname).toBe('바뀐닉네임');
  });

  test('POST /logout → 이후 같은 토큰은 401', async () => {
    const out = await request(app).post('/api/users/logout').set(bearer(token));
    expect(out.status).toBe(200);
    const res = await request(app).get('/api/users/me').set(bearer(token));
    expect(res.status).toBe(401);
  });

  test('DELETE /me → 200 탈퇴 후 로그인 불가', async () => {
    const login = await request(app).post('/api/users/login').send({ email: newUser.email, password: newUser.password });
    const res = await request(app).delete('/api/users/me').set(bearer(login.body.data.token));
    expect(res.status).toBe(200);
    const again = await request(app).post('/api/users/login').send({ email: newUser.email, password: newUser.password });
    expect(again.status).toBe(401);
  });
});
