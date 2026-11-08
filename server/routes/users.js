// 회원 라우터 /api/users  (과제 라우터 개수에서 제외)
// POST   /signup  회원가입
// POST   /login   로그인 (토큰 발급)
// POST   /logout  로그아웃
// GET    /me      내 정보 조회
// PUT    /me      닉네임·비밀번호 수정
// DELETE /me      회원 탈퇴
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { auth, signToken, revokeToken } = require('../middlewares/auth');
const { HttpError, asyncHandler, ok, requireText } = require('../utils/http');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkPassword(password) {
  if (typeof password !== 'string' || password.length < 6 || password.length > 50) {
    throw new HttpError(400, '비밀번호는 6~50자로 입력해 주세요.');
  }
}

function checkNickname(nickname) {
  const value = requireText(nickname, '닉네임', 20);
  if (value.length < 2) throw new HttpError(400, '닉네임은 2~20자로 입력해 주세요.');
  return value;
}

const toUser = (row) => ({
  id: row.id,
  email: row.email,
  nickname: row.nickname,
  role: row.role,
  createdAt: row.created_at,
});

// 회원가입
router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const { email, password, nickname } = req.body;
    if (typeof email !== 'string' || !EMAIL_RE.test(email)) throw new HttpError(400, '올바른 이메일을 입력해 주세요.');
    checkPassword(password);
    const nick = checkNickname(nickname);

    const [dup] = await pool.query('SELECT email, nickname FROM users WHERE email = ? OR nickname = ?', [email, nick]);
    if (dup.some((u) => u.email === email)) throw new HttpError(409, '이미 가입된 이메일입니다.');
    if (dup.length > 0) throw new HttpError(409, '이미 사용 중인 닉네임입니다.');

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query('INSERT INTO users (email, password, nickname) VALUES (?, ?, ?)', [email, hash, nick]);
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    ok(res, toUser(rows[0]), 201);
  })
);

// 로그인
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) throw new HttpError(400, '이메일과 비밀번호를 입력해 주세요.');

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new HttpError(401, '이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    ok(res, { token: signToken(user), user: toUser(user) });
  })
);

// 로그아웃 (지금 토큰을 더 이상 쓸 수 없게 막음)
router.post(
  '/logout',
  auth,
  asyncHandler(async (req, res) => {
    await revokeToken(req.tokenId, req.tokenExp);
    ok(res, { message: '로그아웃되었습니다.' });
  })
);

// 내 정보 조회
router.get(
  '/me',
  auth,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    ok(res, toUser(rows[0]));
  })
);

// 닉네임·비밀번호 수정
router.put(
  '/me',
  auth,
  asyncHandler(async (req, res) => {
    const { nickname, password, currentPassword } = req.body;
    if (nickname === undefined && password === undefined) {
      throw new HttpError(400, '수정할 닉네임 또는 비밀번호를 입력해 주세요.');
    }

    const sets = [];
    const params = [];
    if (nickname !== undefined) {
      const nick = checkNickname(nickname);
      const [dup] = await pool.query('SELECT id FROM users WHERE nickname = ? AND id <> ?', [nick, req.user.id]);
      if (dup.length > 0) throw new HttpError(409, '이미 사용 중인 닉네임입니다.');
      sets.push('nickname = ?');
      params.push(nick);
    }
    if (password !== undefined) {
      if (!currentPassword) {
        throw new HttpError(400, '현재 비밀번호를 입력해 주세요.');
      }
      const [uRows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
      if (uRows.length === 0 || !(await bcrypt.compare(currentPassword, uRows[0].password))) {
        throw new HttpError(400, '현재 비밀번호가 일치하지 않습니다.');
      }
      checkPassword(password);
      sets.push('password = ?');
      params.push(await bcrypt.hash(password, 10));
    }

    await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [...params, req.user.id]);
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    ok(res, toUser(rows[0]));
  })
);

// 회원 탈퇴 (작성한 리뷰·찜·판매글도 함께 삭제됨: ON DELETE CASCADE)
router.delete(
  '/me',
  auth,
  asyncHandler(async (req, res) => {
    await pool.query('DELETE FROM users WHERE id = ?', [req.user.id]);
    await revokeToken(req.tokenId, req.tokenExp);
    ok(res, { message: '회원 탈퇴가 완료되었습니다.' });
  })
);

module.exports = router;
