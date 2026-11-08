// 인증 미들웨어 (JWT)
//   auth         : 로그인 필수 → 토큰이 없거나 잘못되면 401
//   optionalAuth : 토큰이 있으면 사용자를 확인하고, 없으면 비로그인으로 통과
//   adminOnly    : auth 다음에 사용, 관리자(role = 'admin')만 통과 → 아니면 403
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
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
    const [revoked] = await pool.query('SELECT token_id FROM revoked_tokens WHERE token_id = ?', [payload.jti]);
    if (revoked && revoked.length > 0) {
      revokedTokensCache.add(payload.jti);
      throw new HttpError(401, '로그아웃된 토큰입니다. 다시 로그인해 주세요.');
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    // DB 테이블 미생성 또는 연결 문제 시 메모리 캐시로 fallback
  }

  const [rows] = await pool.query('SELECT id, email, nickname, role FROM users WHERE id = ?', [payload.id]);
  if (rows.length === 0) throw new HttpError(401, '존재하지 않는 회원입니다.');
  return { user: rows[0], jti: payload.jti, exp: payload.exp };
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
    await pool.query(
      'INSERT INTO revoked_tokens (token_id, expires_at) VALUES (?, ?) ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at)',
      [tokenId, expDate]
    );
  } catch (err) {
    // DB 테이블이 없거나 장애 시 인메모리 캐시로 유지
    console.error('Failed to save revoked token to DB:', err.message);
  }
};

module.exports = { auth, optionalAuth, adminOnly, signToken, revokeToken };
