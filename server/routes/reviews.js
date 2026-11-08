// 2. 리뷰 라우터 /api/reviews  (6개)
// GET    /                    목록 (향수별 필터·정렬·페이지)
// GET    /stats/:perfumeId    향수별 평균 별점·리뷰 수·별점 분포
// GET    /:id                 상세
// POST   /                  ★ 작성 (로그인)
// PUT    /:id                 수정 (본인만)
// DELETE /:id                 삭제 (본인만)
const express = require('express');
const pool = require('../db/pool');
const { auth } = require('../middlewares/auth');
const { HttpError, asyncHandler, ok, parsePaging, pagination, toInt, requireText } = require('../utils/http');

const router = express.Router();

// 작성자 닉네임, 향수 이름을 함께 가져오는 기본 SELECT
const SELECT_REVIEW = `
  SELECT r.*, u.nickname, p.brand, p.name AS perfume_name
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    JOIN perfumes p ON p.id = r.perfume_id`;

// 프론트의 Review 형태(perfumeName, authorName)에 맞춘 응답
const toReview = (row) => ({
  id: row.id,
  perfumeId: row.perfume_id,
  perfumeName: `${row.brand} ${row.perfume_name}`,
  userId: row.user_id,
  authorName: row.nickname,
  rating: row.rating,
  content: row.content,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

async function findReview(id) {
  const [rows] = await pool.query(`${SELECT_REVIEW} WHERE r.id = ?`, [id]);
  if (rows.length === 0) throw new HttpError(404, '리뷰를 찾을 수 없습니다.');
  return rows[0];
}

async function ensurePerfume(perfumeId) {
  const [rows] = await pool.query('SELECT id FROM perfumes WHERE id = ?', [perfumeId]);
  if (rows.length === 0) throw new HttpError(404, '향수를 찾을 수 없습니다.');
}

const checkRating = (rating) => toInt(rating, '별점(rating)', { min: 1, max: 5 });
const checkContent = (content) => requireText(content, '후기 내용(content)', 1000);

// 목록: GET /api/reviews?perfumeId=&sort=latest|rating&page=&limit=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { perfumeId, sort = 'latest' } = req.query;
    const { page, limit, offset } = parsePaging(req.query, 10, 50);

    const orderBy = {
      latest: 'r.created_at DESC, r.id DESC',
      rating: 'r.rating DESC, r.created_at DESC, r.id DESC',
    }[sort];
    if (!orderBy) throw new HttpError(400, 'sort는 latest 또는 rating이어야 합니다.');

    const where = perfumeId ? 'WHERE r.perfume_id = ?' : '';
    const params = perfumeId ? [perfumeId] : [];

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM reviews r ${where}`, params);
    const [rows] = await pool.query(`${SELECT_REVIEW} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [
      ...params,
      limit,
      offset,
    ]);
    ok(res, rows.map(toReview), 200, { pagination: pagination(page, limit, total) });
  })
);

// 향수별 별점 통계: GET /api/reviews/stats/:perfumeId
router.get(
  '/stats/:perfumeId',
  asyncHandler(async (req, res) => {
    const { perfumeId } = req.params;
    await ensurePerfume(perfumeId);

    const [rows] = await pool.query(
      'SELECT rating, COUNT(*) AS cnt FROM reviews WHERE perfume_id = ? GROUP BY rating',
      [perfumeId]
    );
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
    ok(res, toReview(await findReview(req.params.id)));
  })
);

// ★ 작성: POST /api/reviews  { perfumeId, rating, content }
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { perfumeId } = req.body;
    if (!perfumeId) throw new HttpError(400, '향수(perfumeId)를 선택해 주세요.');
    const rating = checkRating(req.body.rating);
    const content = checkContent(req.body.content);
    await ensurePerfume(perfumeId);

    const [existing] = await pool.query('SELECT id FROM reviews WHERE user_id = ? AND perfume_id = ?', [
      req.user.id,
      perfumeId,
    ]);
    if (existing.length > 0) {
      throw new HttpError(409, '이미 이 향수에 작성한 리뷰가 있습니다. 기존 리뷰를 수정해 주세요.');
    }

    try {
      const [result] = await pool.query(
        'INSERT INTO reviews (user_id, perfume_id, rating, content) VALUES (?, ?, ?, ?)',
        [req.user.id, perfumeId, rating, content]
      );
      ok(res, toReview(await findReview(result.insertId)), 201);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new HttpError(409, '이미 이 향수에 작성한 리뷰가 있습니다.');
      }
      throw err;
    }
  })
);

// 본인 리뷰인지 확인 (없으면 404, 남의 리뷰면 403)
async function findOwnReview(id, userId) {
  const review = await findReview(id);
  if (review.user_id !== userId) throw new HttpError(403, '본인이 작성한 리뷰만 수정·삭제할 수 있습니다.');
  return review;
}

// 수정: PUT /api/reviews/:id  { rating?, content? }
router.put(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    await findOwnReview(req.params.id, req.user.id);
    const { rating, content } = req.body;
    if (rating === undefined && content === undefined) throw new HttpError(400, '수정할 별점 또는 내용을 입력해 주세요.');

    const cols = {};
    if (rating !== undefined) cols.rating = checkRating(rating);
    if (content !== undefined) cols.content = checkContent(content);
    await pool.query('UPDATE reviews SET ? WHERE id = ?', [cols, req.params.id]);
    ok(res, toReview(await findReview(req.params.id)));
  })
);

// 삭제: DELETE /api/reviews/:id
router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    await findOwnReview(req.params.id, req.user.id);
    await pool.query('DELETE FROM reviews WHERE id = ?', [req.params.id]);
    ok(res, { id: Number(req.params.id), message: '리뷰가 삭제되었습니다.' });
  })
);

module.exports = router;
