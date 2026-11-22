// 2. 리뷰 라우터 /api/reviews  (6개)
// GET    /                    목록 (향수별 필터·정렬·페이지)
// GET    /stats/:perfumeId    향수별 평균 별점·리뷰 수·별점 분포
// GET    /:id                 상세
// POST   /                  ★ 작성 (로그인)
// PUT    /:id                 수정 (본인만)
// DELETE /:id                 삭제 (본인만)
const express = require('express');
const { Sequelize } = require('sequelize');
const { Review, User, Perfume } = require('../models');
const { auth } = require('../middlewares/auth');
const { HttpError, asyncHandler, ok, parsePaging, pagination, toInt, requireText } = require('../utils/http');

const router = express.Router();

// 작성자 닉네임, 향수 정보를 함께 가져오는 include 설정
const reviewIncludes = [
  { model: User, as: 'user', attributes: ['id', 'nickname'] },
  { model: Perfume, as: 'perfume', attributes: ['brand', 'name'] },
];

async function findReview(id) {
  const review = await Review.findByPk(id, { include: reviewIncludes });
  if (!review) throw new HttpError(404, '리뷰를 찾을 수 없습니다.');
  return review;
}

async function ensurePerfume(perfumeId) {
  const perfume = await Perfume.findByPk(perfumeId, { attributes: ['id'] });
  if (!perfume) throw new HttpError(404, '향수를 찾을 수 없습니다.');
}

const checkRating = (rating) => toInt(rating, '별점(rating)', { min: 1, max: 5 });
const checkContent = (content) => requireText(content, '후기 내용(content)', 1000);

/**
 * [핵심 API 1] 리뷰 목록 조회 (향수별 필터링, 정렬 및 페이징)
 * - Method / Path: GET /api/reviews
 * - Query Params: perfumeId(특정 향수), sort(latest: 최신순 / rating: 별점 높은 순), page, limit
 * - 핵심 로직: Sequelize include로 작성자 정보와 향수 정보를 함께 조회
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { perfumeId, sort = 'latest' } = req.query;
    const { page, limit, offset } = parsePaging(req.query, 10, 50);

    const orderMap = {
      latest: [['createdAt', 'DESC'], ['id', 'DESC']],
      rating: [['rating', 'DESC'], ['createdAt', 'DESC'], ['id', 'DESC']],
    };
    const order = orderMap[sort];
    if (!order) throw new HttpError(400, 'sort는 latest 또는 rating이어야 합니다.');

    const where = {};
    if (perfumeId) where.perfumeId = perfumeId;

    const { count: total, rows: reviews } = await Review.findAndCountAll({
      where,
      order,
      limit,
      offset,
      include: reviewIncludes,
      distinct: true,
    });

    ok(res, reviews, 200, { pagination: pagination(page, limit, total) });
  })
);

/**
 * [핵심 API 2] 향수별 별점 통계 조회 (평균 별점 및 1~5점 분포 집계)
 * - Method / Path: GET /api/reviews/stats/:perfumeId
 * - 핵심 로직: Sequelize 집계 쿼리를 실행하여 총 리뷰 수, 소수점 첫째 자리 평균 별점, 1~5점별 개수를 계산
 */
router.get(
  '/stats/:perfumeId',
  asyncHandler(async (req, res) => {
    const { perfumeId } = req.params;
    await ensurePerfume(perfumeId);

    const rows = await Review.findAll({
      attributes: ['rating', [Sequelize.fn('COUNT', Sequelize.col('id')), 'cnt']],
      where: { perfumeId },
      group: ['rating'],
      raw: true,
    });

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let count = 0;
    let sum = 0;
    for (const r of rows) {
      distribution[r.rating] = Number(r.cnt);
      count += Number(r.cnt);
      sum += r.rating * Number(r.cnt);
    }

    ok(res, {
      perfumeId,
      reviewCount: count,
      averageRating: count ? Math.round((sum / count) * 10) / 10 : 0,
      distribution,
    });
  })
);

// 상세: GET /api/reviews/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const review = await findReview(req.params.id);
    ok(res, review);
  })
);

/**
 * [핵심 API 3] 리뷰 작성 (로그인 필수, 어뷰징/별점 조작 방지)
 * - Method / Path: POST /api/reviews
 * - Request Body: { perfumeId, rating(1~5), content }
 * - 핵심 로직 & 보안:
 *   1) 한 사용자가 동일 향수에 여러 번 리뷰를 남겨 별점을 조작하는 것을 방지
 *   2) DB 복합 유니크 제약 `UNIQUE (user_id, perfume_id)` + 사전 SELECT 검증으로 중복 작성 시 409 Conflict 응답
 */
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { perfumeId } = req.body;
    if (!perfumeId) throw new HttpError(400, '향수(perfumeId)를 선택해 주세요.');
    const rating = checkRating(req.body.rating);
    const content = checkContent(req.body.content);
    await ensurePerfume(perfumeId);

    const existing = await Review.findOne({
      where: { userId: req.user.id, perfumeId },
      attributes: ['id'],
    });
    if (existing) {
      throw new HttpError(409, '이미 이 향수에 작성한 리뷰가 있습니다. 기존 리뷰를 수정해 주세요.');
    }

    try {
      const created = await Review.create({
        userId: req.user.id,
        perfumeId,
        rating,
        content,
      });
      const review = await findReview(created.id);
      ok(res, review, 201);
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError' || err.code === 'ER_DUP_ENTRY') {
        throw new HttpError(409, '이미 이 향수에 작성한 리뷰가 있습니다.');
      }
      throw err;
    }
  })
);

// 본인 리뷰인지 확인 (없으면 404, 남의 리뷰면 403)
async function findOwnReview(id, userId) {
  const review = await findReview(id);
  if (review.userId !== userId) throw new HttpError(403, '본인이 작성한 리뷰만 수정·삭제할 수 있습니다.');
  return review;
}

// 수정: PUT /api/reviews/:id  { rating?, content? }
router.put(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const review = await findOwnReview(req.params.id, req.user.id);
    const { rating, content } = req.body;
    if (rating === undefined && content === undefined) throw new HttpError(400, '수정할 별점 또는 내용을 입력해 주세요.');

    const updates = {};
    if (rating !== undefined) updates.rating = checkRating(rating);
    if (content !== undefined) updates.content = checkContent(content);

    await review.update(updates);
    const updated = await findReview(req.params.id);
    ok(res, updated);
  })
);

// 삭제: DELETE /api/reviews/:id
router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const review = await findOwnReview(req.params.id, req.user.id);
    await review.destroy();
    ok(res, { id: Number(req.params.id), message: '리뷰가 삭제되었습니다.' });
  })
);

module.exports = router;
