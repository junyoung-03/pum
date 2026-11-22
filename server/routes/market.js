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
const { HttpError, asyncHandler, ok, parsePaging, pagination, toInt, requireText } = require('../utils/http');
const { CATEGORIES, MARKET_STATUS } = require('../utils/constants');

const router = express.Router();

/**
 * 등록·수정 본문 검사 → Sequelize Model 필드
 * isCreate가 true이면 필수 값(title, volumeMl, remainPercent, price)을 확인
 * perfumeId의 존재 확인 및 brand·category 기본값 처리는 모델에서 수행
 */
function bodyToColumns(body, isCreate) {
  const cols = {};

  if (isCreate || body.title !== undefined) cols.title = requireText(body.title, '제목(title)', 100);

  if (body.perfumeId !== undefined && body.perfumeId !== null && body.perfumeId !== '') {
    cols.perfumeId = body.perfumeId;
  } else if (body.perfumeId === null || body.perfumeId === '') {
    cols.perfumeId = null;
  }

  if (body.brand !== undefined) cols.brand = requireText(body.brand, '브랜드(brand)', 50);
  if (isCreate && !cols.brand && !cols.perfumeId) throw new HttpError(400, '브랜드(brand)를 입력하거나 perfumeId를 선택해 주세요.');

  if (body.category !== undefined) {
    if (body.category === null || body.category === '') {
      cols.category = null;
    } else {
      if (!CATEGORIES.includes(body.category)) throw new HttpError(400, `category는 ${CATEGORIES.join(', ')} 중 하나여야 합니다.`);
      cols.category = body.category;
    }
  }

  if (isCreate || body.volumeMl !== undefined) cols.volumeMl = toInt(body.volumeMl, '용량(volumeMl)', { min: 1, max: 1000 });
  if (isCreate || body.remainPercent !== undefined) {
    cols.remainPercent = toInt(body.remainPercent, '잔량(remainPercent)', { min: 1, max: 100 });
  }
  if (isCreate || body.price !== undefined) cols.price = toInt(body.price, '가격(price)', { min: 0, max: 100000000 });

  if (body.content !== undefined) {
    if (typeof body.content !== 'string' || body.content.length > 2000) {
      throw new HttpError(400, '내용(content)은 2000자 이하로 입력해 주세요.');
    }
    cols.content = body.content.trim();
  }
  return cols;
}

/**
 * [핵심 API 1] 중고 판매글 목록 조회 (다중 필터링, 정렬 및 페이징)
 * - Method / Path: GET /api/market
 * - Query Params: brand, category, status(판매중/예약중/판매완료), minPrice, maxPrice, sort, page, limit
 * - 핵심 로직: 빈 문자열 가격 쿼리 방어 로직 적용, Sequelize include로 거래(order) 진행 상태를 함께 조회
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { brand, category, status, sort = 'latest' } = req.query;
    const { page, limit, offset } = parsePaging(req.query, 10, 50);

    if (category) {
      if (!CATEGORIES.includes(category)) throw new HttpError(400, `category는 ${CATEGORIES.join(', ')} 중 하나여야 합니다.`);
    }
    if (status) {
      if (!MARKET_STATUS.includes(status)) throw new HttpError(400, `status는 ${MARKET_STATUS.join(', ')} 중 하나여야 합니다.`);
    }

    const minPrice =
      req.query.minPrice !== undefined && req.query.minPrice !== '' ? toInt(req.query.minPrice, 'minPrice', { min: 0 }) : null;
    const maxPrice =
      req.query.maxPrice !== undefined && req.query.maxPrice !== '' ? toInt(req.query.maxPrice, 'maxPrice', { min: 0 }) : null;
    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      throw new HttpError(400, 'minPrice는 maxPrice보다 클 수 없습니다.');
    }
    if (!['latest', 'priceAsc', 'priceDesc'].includes(sort)) throw new HttpError(400, 'sort는 latest, priceAsc, priceDesc 중 하나여야 합니다.');

    const { count: total, rows: posts } = await MarketPost.listPage({
      brand, category, status, sort, minPrice, maxPrice,
      limit,
      offset,
    });

    ok(res, posts, 200, { pagination: pagination(page, limit, total) });
  })
);

/**
 * [기능 API] 내 판매글 목록 조회
 * - Method / Path: GET /api/market/my
 * - Auth: 로그인 필수
 * - 핵심 로직: 로그인한 사용자가 등록한 중고 판매글과 각각의 거래(order) 진행 상태를 최신순으로 조회
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
 * - 핵심 로직: 판매글 정보, 판매자 닉네임, 잔량/가격, 연결된 향수 및 현재 거래 진행 상태(order) 반환
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
 * - Request Body: { title, perfumeId?, brand, category?, volumeMl, remainPercent, price, content? }
 * - 핵심 로직: 필수 항목 유효성 검사 및 향수(perfumeId) 선택 시 브랜드/계열 자동 매핑
 */
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const cols = bodyToColumns(req.body, true);
    const created = await MarketPost.createPost({ ...cols, userId: req.user.id });
    ok(res, created, 201);
  })
);

/**
 * [기능 API] 판매글 수정
 * - Method / Path: PUT /api/market/:id
 * - Auth: 로그인 필수 (작성자 본인만)
 * - Request Body: 수정할 필드들
 * - 핵심 로직: 본인 글 검증, 구매 신청이 들어온 글은 수정 차단(409), category를 null로 비우는 수정도 완벽 지원
 */
router.put(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const post = await MarketPost.findOwn(req.params.id, req.user.id);
    post.assertNoOrder();
    if (req.body.status !== undefined) {
      throw new HttpError(400, '거래 상태는 PATCH /api/market/:id/status로 변경해 주세요.');
    }
    const cols = bodyToColumns(req.body, false);
    if (Object.keys(cols).length === 0) throw new HttpError(400, '수정할 항목을 입력해 주세요.');
    const updated = await MarketPost.changeOwn(req.params.id, req.user.id, cols);
    ok(res, updated);
  })
);

/**
 * [핵심 API 3] 거래 상태 수동 변경 (판매중 / 예약중 / 판매완료)
 * - Method / Path: PATCH /api/market/:id/status
 * - Request Body: { status }
 * - 핵심 로직: 본인 글만 수정 가능하며, 구매 신청(order)이 진행 중인 글은 409 Conflict로 차단
 */
router.patch(
  '/:id/status',
  auth,
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!MARKET_STATUS.includes(status)) throw new HttpError(400, `status는 ${MARKET_STATUS.join(', ')} 중 하나여야 합니다.`);
    const post = await MarketPost.findOwn(req.params.id, req.user.id);
    post.assertNoOrder();
    const updated = await MarketPost.changeOwn(req.params.id, req.user.id, { status });
    ok(res, updated);
  })
);

/**
 * [기능 API] 판매글 삭제
 * - Method / Path: DELETE /api/market/:id
 * - Auth: 로그인 필수 (작성자 본인만)
 * - 핵심 로직: 본인 글 검증, 이미 구매 진행 중인 글은 삭제 차단(409), 삭제 시 연관 데이터 정리
 */
router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const post = await MarketPost.findOwn(req.params.id, req.user.id);
    post.assertNoOrder();
    await MarketPost.removeOwn(req.params.id, req.user.id);
    ok(res, { id: Number(req.params.id), message: '판매글이 삭제되었습니다.' });
  })
);

module.exports = router;
