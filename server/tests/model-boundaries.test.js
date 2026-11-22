const { Order, MarketPost, User } = require('../models');
const { app, request, login, bearer } = require('./helpers');

const receiver = { receiverName: '테스트', receiverPhone: '010-1234-5678', address: '서울특별시 테스트 주소' };

test('판매자 응답은 연관 객체를 유지하고 배송 원본 필드를 숨긴다', async () => {
  const order = await Order.findDetail(1);
  const response = order.toResponse(false);
  expect(response.receiver).toBeNull();
  for (const key of ['receiverName', 'receiverPhone', 'address', 'buyerId', 'postId']) {
    expect(response).not.toHaveProperty(key);
  }
  expect(response.seller).toHaveProperty('nickname');
  expect(order.post.seller).toBeDefined();
  expect(order.toResponse(true).receiver).toHaveProperty('address');
  const user = await User.findByPk(2);
  expect(user.password).toBeDefined();
  expect(user.toJSON()).not.toHaveProperty('password');
});

test('판매글 저장 실패 시 주문 생성도 롤백된다', async () => {
  const hookName = 'testPurchaseRollback';
  MarketPost.addHook('beforeUpdate', hookName, () => { throw new Error('forced failure'); });
  try {
    await expect(Order.purchase(1, 3, receiver)).rejects.toThrow('forced failure');
  } finally {
    MarketPost.removeHook('beforeUpdate', hookName);
  }
  expect(await Order.count({ where: { postId: 1 } })).toBe(0);
  expect((await MarketPost.findByPk(1)).status).toBe('판매중');
});

test('동일 판매글 동시 구매는 하나만 생성된다', async () => {
  const results = await Promise.allSettled([Order.purchase(1, 3, receiver), Order.purchase(1, 1, receiver)]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(results.find((r) => r.status === 'rejected').reason.status).toBe(409);
  expect(await Order.count({ where: { postId: 1 } })).toBe(1);
  expect((await MarketPost.findByPk(1)).status).toBe('예약중');
});

test('현재 암호가 틀리면 닉네임과 암호를 모두 변경하지 않는다', async () => {
  const token = await login('lover');
  const before = await User.findByPk(2);
  const response = await request(app).put('/api/users/me').set(bearer(token)).send({
    nickname: '변경실패회원', currentPassword: 'incorrect', password: 'changed1234',
  });
  expect(response.status).toBe(400);
  const after = await User.findByPk(2);
  expect(after.nickname).toBe(before.nickname);
  expect(after.password).toBe(before.password);
});

test('암호 변경 후 기존 암호는 거부하고 새 암호로 로그인한다', async () => {
  const token = await login('lover');
  const changed = await request(app).put('/api/users/me').set(bearer(token)).send({
    currentPassword: 'user1234', password: 'changed1234',
  });
  expect(changed.status).toBe(200);
  expect(changed.body.data).not.toHaveProperty('password');
  const oldLogin = await request(app).post('/api/users/login').send({ email: 'lover@scentique.com', password: 'user1234' });
  expect(oldLogin.status).toBe(401);
  const newLogin = await request(app).post('/api/users/login').send({ email: 'lover@scentique.com', password: 'changed1234' });
  expect(newLogin.status).toBe(200);
  expect(newLogin.body.data.user).not.toHaveProperty('password');
});
