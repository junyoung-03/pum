// 인증 미들웨어 (JWT)
//   auth         : 로그인 필수 → 토큰이 없거나 잘못되면 401
//   optionalAuth : 토큰이 있으면 사용자를 확인하고, 없으면 비로그인으로 통과
//   adminOnly    : auth 다음에 사용, 관리자(role = 'admin')만 통과 → 아니면 403
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { jwt: jwtConfig } = require('../config');
const { HttpError, asyncHandler } = require('../utils/http');

// 로그아웃·탈퇴한 토큰의 고유 id(jti) 목록 (서버 메모리에 보관 → 서버를 재시작하면 초기화됨)
const revokedTokens = new Set();

// jwtid: 토큰마다 고유 id를 붙여서, 같은 초에 발급된 토큰도 서로 구분되게 함
const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
    jwtid: crypto.randomUUID(),
  });

function getToken(req) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');
  return type === 'Bearer' && token ? token : null;
}

async function verify(token) {
  let payload;
  try {
    payload = jwt.verify(token, jwtConfig.secret);
  } catch {
    throw new HttpError(401, '유효하지 않거나 만료된 토큰입니다.');
  }
  if (revokedTokens.has(payload.jti)) throw new HttpError(401, '로그아웃된 토큰입니다. 다시 로그인해 주세요.');

  const [rows] = await pool.query('SELECT id, email, nickname, role FROM users WHERE id = ?', [payload.id]);
  if (rows.length === 0) throw new HttpError(401, '존재하지 않는 회원입니다.');
  return { user: rows[0], jti: payload.jti };
}

const auth = asyncHandler(async (req, res, next) => {
  const token = getToken(req);
  if (!token) throw new HttpError(401, '로그인이 필요합니다.');
  const { user, jti } = await verify(token);
  req.user = user;
  req.tokenId = jti;
  next();
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = getToken(req);
  if (token) {
    const { user, jti } = await verify(token);
    req.user = user;
    req.tokenId = jti;
  }
  next();
});

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') return next(new HttpError(403, '관리자만 사용할 수 있습니다.'));
  next();
};

const revokeToken = (tokenId) => revokedTokens.add(tokenId);

module.exports = { auth, optionalAuth, adminOnly, signToken, revokeToken };
