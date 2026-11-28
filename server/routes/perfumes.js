// 1. 향수 라우터 /api/perfumes  (7개)
// GET    /              ★ 목록 (검색·필터·페이지)
// GET    /featured        대표 향수 3종 (홈 Best Collection)
// GET    /:id           ★ 상세
// GET    /:id/similar     비슷한 향수 (유사도 점수 순)
// POST   /                향수 등록 (관리자)
// PUT    /:id             향수 수정 (관리자)
// DELETE /:id             향수 삭제 (관리자)
//
// 주의: '/featured' 같은 고정 경로는 '/:id'보다 위에 선언해야 합니다.
const express = require('express');
const { Perfume } = require('../models');
const { auth, adminOnly } = require('../middlewares/auth');
const { asyncHandler, ok, pagination, toInt } = require('../utils/http');
const {
  validatePerfumeQuery,
  validateCreatePerfume,
  validateUpdatePerfume,
} = require('../validators/perfumes');

const router = express.Router();

/**
 * [핵심 API 1] 향수 목록 조회 (다중 조건 필터링 및 페이징)
 * - Method / Path: GET /api/perfumes
 */
router.get(
  '/',
  validatePerfumeQuery,
  asyncHandler(async (req, res) => {
    const { page, limit, ...filters } = req.validatedQuery;
    const { count: total, rows: perfumes } = await Perfume.listPage({ ...filters, limit });
    ok(res, perfumes, 200, { pagination: pagination(page, limit, total) });
  })
);

/**
 * [핵심 API 2] 홈 화면 대표 향수 3종 조회 (Featured Showcase)
 * - Method / Path: GET /api/perfumes/featured
 */
router.get(
  '/featured',
  asyncHandler(async (req, res) => {
    const rows = await Perfume.listFeatured();
    ok(res, rows);
  })
);

/**
 * [핵심 API 3] 향수 단건 상세 조회
 * - Method / Path: GET /api/perfumes/:id
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const perfume = await Perfume.findDetail(req.params.id);
    ok(res, perfume);
  })
);

/**
 * [핵심 API 4] 비슷한 향수 추천 알고리즘 (Similarity Recommendation)
 * - Method / Path: GET /api/perfumes/:id/similar?limit=3
 */
router.get(
  '/:id/similar',
  asyncHandler(async (req, res) => {
    const limit = req.query.limit === undefined ? 3 : toInt(req.query.limit, 'limit', { min: 1, max: 10 });
    const { result, base } = await Perfume.findSimilar(req.params.id, limit);
    ok(res, result, 200, { base });
  })
);

/**
 * [관리자 API] 신규 향수 등록
 * - Method / Path: POST /api/perfumes
 */
router.post(
  '/',
  auth,
  adminOnly,
  validateCreatePerfume,
  asyncHandler(async (req, res) => {
    const { id, cols } = req.validated;
    const created = await Perfume.createPerfume(id, cols);
    ok(res, created, 201);
  })
);

/**
 * [관리자 API] 향수 정보 수정
 * - Method / Path: PUT /api/perfumes/:id
 */
router.put(
  '/:id',
  auth,
  adminOnly,
  validateUpdatePerfume,
  asyncHandler(async (req, res) => {
    const perfume = await Perfume.changePerfume(req.params.id, req.validated);
    ok(res, perfume);
  })
);

/**
 * [관리자 API] 향수 삭제
 * - Method / Path: DELETE /api/perfumes/:id
 */
router.delete(
  '/:id',
  auth,
  adminOnly,
  asyncHandler(async (req, res) => {
    await Perfume.removePerfume(req.params.id);
    ok(res, { id: req.params.id, message: '향수가 삭제되었습니다.' });
  })
);

module.exports = router;
