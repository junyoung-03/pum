// 테스트용 도우미: seed.sql에 들어 있는 계정으로 로그인해서 토큰 받기
const request = require('supertest');
const app = require('../app');

const ACCOUNTS = {
  admin: { email: 'admin@scentique.com', password: 'admin1234' },
  lover: { email: 'lover@scentique.com', password: 'user1234' }, // id 2, 향수러버
  daily: { email: 'daily@scentique.com', password: 'user1234' }, // id 3, 데일리향수
};

async function login(name) {
  const res = await request(app).post('/api/users/login').send(ACCOUNTS[name]);
  if (res.status !== 200) throw new Error(`테스트 계정 로그인 실패: ${name}`);
  return res.body.data.token;
}

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { app, request, login, bearer };
