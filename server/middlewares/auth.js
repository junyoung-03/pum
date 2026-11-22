// 인증 미들웨어 (JWT + Sequelize)
//   auth         : 로그인 필수 → 토큰이 없거나 잘못되면 401
//   optionalAuth : 토큰이 있으면 사용자를 확인하고, 없으면 비로그인으로 통과
//   adminOnly    : auth 다음에 사용, 관리자(role = 'admin')만 통과 → 아니면 403
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User, RevokedToken } = require('../models');
const { jwt: jwtConfig } = require('../config');
const { HttpError, asyncHandler } = require('../utils/http');

// 로그아웃·탈퇴한 토큰의 고유 id(jti) 목록 (DB 영속 저장 + 인메모리 캐시)
const revokedTokensCache = new Set();

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

  if (revokedTokensCache.has(payload.jti)) {
    throw new HttpError(401, '로그아웃된 토큰입니다. 다시 로그인해 주세요.');
  }

  try {
    const revoked = await RevokedToken.findByPk(payload.jti);
    if (revoked) {
      revokedTokensCache.add(payload.jti);
      throw new HttpError(401, '로그아웃된 토큰입니다. 다시 로그인해 주세요.');
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
  }

  const user = await User.findByPk(payload.id, {
    attributes: ['id', 'email', 'nickname', 'role'],
  });
  if (!user) throw new HttpError(401, '존재하지 않는 회원입니다.');
  return { user: user.get({ plain: true }), jti: payload.jti, exp: payload.exp };
}

const auth = asyncHandler(async (req, res, next) => {
  const token = getToken(req);
  if (!token) throw new HttpError(401, '로그인이 필요합니다.');
  const { user, jti, exp } = await verify(token);
  req.user = user;
  req.tokenId = jti;
  req.tokenExp = exp ? new Date(exp * 1000) : null;
  next();
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = getToken(req);
  if (token) {
    const { user, jti, exp } = await verify(token);
    req.user = user;
    req.tokenId = jti;
    req.tokenExp = exp ? new Date(exp * 1000) : null;
  }
  next();
});

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') return next(new HttpError(403, '관리자만 사용할 수 있습니다.'));
  next();
};

const revokeToken = async (tokenId, expiresAt) => {
  revokedTokensCache.add(tokenId);
  try {
    const expDate = expiresAt instanceof Date ? expiresAt : new Date(Date.now() + 2 * 60 * 60 * 1000);
    await RevokedToken.upsert({
      tokenId,
      expiresAt: expDate,
    });
  } catch (err) {
    console.error('Failed to save revoked token to DB:', err.message);
  }
};

module.exports = { auth, optionalAuth, adminOnly, signToken, revokeToken };
