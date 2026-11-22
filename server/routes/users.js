// 회원 라우터 /api/users  (과제 라우터 개수에서 제외)
// POST   /signup  회원가입
// POST   /login   로그인 (토큰 발급)
// POST   /logout  로그아웃
// GET    /me      내 정보 조회
// PUT    /me      닉네임·비밀번호 수정
// DELETE /me      회원 탈퇴
const express = require('express');
const { User } = require('../models');
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

/**
 * [핵심 API 1] 회원가입
 * - Method / Path: POST /api/users/signup
 * - Request Body: { email, password, nickname }
 * - 핵심 로직 & 보안: 이메일 정규식 검증, 이메일/닉네임 중복 체크(409), 비밀번호 단방향 암호화(bcrypt.hash)
 */
router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const { email, password, nickname } = req.body;
    if (typeof email !== 'string' || !EMAIL_RE.test(email)) throw new HttpError(400, '올바른 이메일을 입력해 주세요.');
    checkPassword(password);
    const nick = checkNickname(nickname);

    const user = await User.register({ email, password, nickname: nick });
    ok(res, user, 201);
  })
);

/**
 * [핵심 API 2] 로그인 (JWT 토큰 발급)
 * - Method / Path: POST /api/users/login
 * - Request Body: { email, password }
 * - 핵심 로직 & 보안: bcrypt.compare로 비밀번호 일치 검증 후 고유 ID(jti)가 포함된 JWT 토큰 발급
 */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) throw new HttpError(400, '이메일과 비밀번호를 입력해 주세요.');

    const user = await User.authenticate(email, password);
    ok(res, { token: signToken(user), user });
  })
);

/**
 * [핵심 API 3] 로그아웃 (JWT 토큰 DB 영속 폐기)
 * - Method / Path: POST /api/users/logout
 * - 핵심 로직 & 보안: 토큰의 jti를 revoked_tokens DB 테이블에 영속 저장하여 서버가 재부팅되어도 토큰 재사용을 영구 차단
 */
router.post(
  '/logout',
  auth,
  asyncHandler(async (req, res) => {
    await revokeToken(req.tokenId, req.tokenExp);
    ok(res, { message: '로그아웃되었습니다.' });
  })
);

/**
 * [기능 API] 내 프로필 정보 조회
 * - Method / Path: GET /api/users/me
 * - Auth: 로그인 필수
 * - 핵심 로직: 현재 토큰의 사용자 ID로 회원 정보(이메일, 닉네임, 역할, 가입일) 반환
 */
router.get(
  '/me',
  auth,
  asyncHandler(async (req, res) => {
    const user = await User.findProfile(req.user.id);
    ok(res, user);
  })
);

/**
 * [핵심 API 4] 내 정보 및 비밀번호 수정 (보안 강화)
 * - Method / Path: PUT /api/users/me
 * - Request Body: { nickname?, password?, currentPassword? }
 * - 핵심 로직 & 보안: 비밀번호 변경 시 반드시 currentPassword를 받아 기존 비밀번호와 일치하는지 bcrypt 검증 후 새 비밀번호 반영
 */
router.put(
  '/me',
  auth,
  asyncHandler(async (req, res) => {
    const { nickname, password, currentPassword } = req.body;
    if (nickname === undefined && password === undefined) {
      throw new HttpError(400, '수정할 닉네임 또는 비밀번호를 입력해 주세요.');
    }

    const changes = {};
    if (nickname !== undefined) changes.nickname = checkNickname(nickname);
    if (password !== undefined) {
      if (!currentPassword) throw new HttpError(400, '현재 비밀번호를 입력해 주세요.');
      checkPassword(password);
      changes.password = password;
      changes.currentPassword = currentPassword;
    }
    const user = await User.changeProfile(req.user.id, changes);
    ok(res, user);
  })
);

/**
 * [기능 API] 회원 탈퇴
 * - Method / Path: DELETE /api/users/me
 * - Auth: 로그인 필수
 * - 핵심 로직: 회원 삭제 시 DB 외래키 CASCADE로 작성했던 찜, 리뷰, 판매글 연쇄 삭제 및 토큰 영구 폐기
 */
router.delete(
  '/me',
  auth,
  asyncHandler(async (req, res) => {
    await User.removeProfile(req.user.id);
    await revokeToken(req.tokenId, req.tokenExp);
    ok(res, { message: '회원 탈퇴가 완료되었습니다.' });
  })
);

module.exports = router;
