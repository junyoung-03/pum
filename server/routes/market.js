// 5. 중고 판매글 라우터 /api/market  (7개)
// GET    /                 판매글 목록 (브랜드·계열·가격·상태 필터, 정렬, 페이지)
// GET    /my               내 판매글 목록 (로그인)
// GET    /:id              판매글 상세
// POST   /               ★ 판매글 등록 (로그인)
// PUT    /:id              판매글 수정 (본인만)
// PATCH  /:id/status       거래 상태 변경 (본인만: 판매중 / 예약중 / 판매완료)
// DELETE /:id              판매글 삭제 (본인만)
//
// 구매 신청(거래)이 들어온 판매글은 상태가 거래 단계에 따라 자동으로 바뀌므로
// 수정·상태 변경·삭제를 막습니다. → 거래는 /api/orders 라우터에서 처리
//
// 주의: '/my'는 '/:id'보다 위에 선언해야 합니다.
const express = require('express');
const { MarketPost } = require('../models');
const { auth } = require('../middlewares/auth');
const { asyncHandler, ok, pagination } = require('../utils/http');
const {
  validateMarketQuery,
  validateCreatePost,
  validateUpdatePost,
  validatePostStatus,
} = require('../validators/market');

const router = express.Router();

/**
 * [핵심 API 1] 중고 판매글 목록 조회 (다중 필터링, 정렬 및 페이징)
 * - Method / Path: GET /api/market
 */
router.get(
  '/',
  validateMarketQuery,
  asyncHandler(async (req, res) => {
    const { page, limit, ...filters } = req.validatedQuery;
    const { count: total, rows: posts } = await MarketPost.listPage({ ...filters, limit });
    ok(res, posts, 200, { pagination: pagination(page, limit, total) });
  })
);

/**
 * [기능 API] 내 판매글 목록 조회
 * - Method / Path: GET /api/market/my
 */
router.get(
  '/my',
  auth,
  asyncHandler(async (req, res) => {
    const posts = await MarketPost.listOwn(req.user.id);
    ok(res, posts);
  })
);

/**
 * [기능 API] 판매글 단건 상세 조회
 * - Method / Path: GET /api/market/:id
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const post = await MarketPost.findDetail(req.params.id);
    ok(res, post);
  })
);

/**
 * [핵심 API 2] 중고 판매글 등록
 * - Method / Path: POST /api/market
 */
router.post(
  '/',
  auth,
  validateCreatePost,
  asyncHandler(async (req, res) => {
    const created = await MarketPost.createPost({ ...req.validated, userId: req.user.id });
    ok(res, created, 201);
  })
);

/**
 * [기능 API] 판매글 수정
 * - Method / Path: PUT /api/market/:id
 */
router.put(
  '/:id',
  auth,
  validateUpdatePost,
  asyncHandler(async (req, res) => {
    const updated = await MarketPost.changeOwn(req.params.id, req.user.id, req.validated);
    ok(res, updated);
  })
);

/**
 * [핵심 API 3] 거래 상태 수동 변경 (판매중 / 예약중 / 판매완료)
 * - Method / Path: PATCH /api/market/:id/status
 */
router.patch(
  '/:id/status',
  auth,
  validatePostStatus,
  asyncHandler(async (req, res) => {
    const updated = await MarketPost.changeOwn(req.params.id, req.user.id, req.validated);
    ok(res, updated);
  })
);

/**
 * [기능 API] 판매글 삭제
 * - Method / Path: DELETE /api/market/:id
 */
router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    await MarketPost.removeOwn(req.params.id, req.user.id);
    ok(res, { id: Number(req.params.id), message: '판매글이 삭제되었습니다.' });
  })
);

module.exports = router;
