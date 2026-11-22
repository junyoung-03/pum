// 3. 찜 라우터 /api/favorites  (6개)
// GET    /ranking              찜 많은 향수 순위
// GET    /                     내 찜 목록 (로그인)
// GET    /:perfumeId/check     찜 여부 확인 (로그인)
// POST   /:perfumeId         ★ 찜 추가 (로그인, 이미 있으면 409)
// DELETE /:perfumeId         ★ 찜 해제 (로그인)
// DELETE /                     찜 전체 비우기 (로그인)
//
// 프론트는 토글(toggleFavorite) 방식이지만, 서버는 추가와 해제를 나눠서 처리합니다.
const express = require('express');
const { Favorite } = require('../models');
const { auth } = require('../middlewares/auth');
const { asyncHandler, ok, toInt } = require('../utils/http');

const router = express.Router();

/**
 * [핵심 API 1] 실시간 인기 찜 랭킹 조회 (Most Loved TOP N)
 * - Method / Path: GET /api/favorites/ranking?limit=5
 * - 핵심 로직: 전체 회원들의 찜 데이터를 Sequelize 집계와 include로 조회하여 상위 N종을 순위와 함께 반환
 */
router.get(
  '/ranking',
  asyncHandler(async (req, res) => {
    const limit = req.query.limit === undefined ? 5 : toInt(req.query.limit, 'limit', { min: 1, max: 20 });
    ok(res, await Favorite.ranking(limit));
  })
);

// 내 찜 목록: GET /api/favorites
router.get(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    ok(res, await Favorite.listOwn(req.user.id));
  })
);

// 찜 여부: GET /api/favorites/:perfumeId/check
router.get(
  '/:perfumeId/check',
  auth,
  asyncHandler(async (req, res) => {
    const { perfumeId } = req.params;
    const isFavorite = await Favorite.check(req.user.id, perfumeId);
    ok(res, { perfumeId, isFavorite });
  })
);

/**
 * [핵심 API 2] 향수 찜 추가 (하트 누르기)
 * - Method / Path: POST /api/favorites/:perfumeId
 * - 핵심 로직: 로그인한 사용자의 찜 목록에 등록하며, DB UNIQUE 제약으로 중복 등록 시 409 응답
 */
router.post(
  '/:perfumeId',
  auth,
  asyncHandler(async (req, res) => {
    const { perfumeId } = req.params;
    await Favorite.add(req.user.id, perfumeId);
    ok(res, { perfumeId, isFavorite: true }, 201);
  })
);

/**
 * [핵심 API 3] 향수 찜 해제 (하트 취소)
 * - Method / Path: DELETE /api/favorites/:perfumeId
 * - 핵심 로직: 로그인한 회원의 찜 레코드를 삭제하고 토글 상태(`isFavorite: false`) 반환
 */
router.delete(
  '/:perfumeId',
  auth,
  asyncHandler(async (req, res) => {
    const { perfumeId } = req.params;
    await Favorite.remove(req.user.id, perfumeId);
    ok(res, { perfumeId, isFavorite: false });
  })
);

// 전체 비우기: DELETE /api/favorites
router.delete(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const deletedCount = await Favorite.clearOwn(req.user.id);
    ok(res, { deletedCount });
  })
);

module.exports = router;
