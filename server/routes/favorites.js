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
const pool = require('../db/pool');
const { auth } = require('../middlewares/auth');
const { HttpError, asyncHandler, ok, toInt } = require('../utils/http');
const { toPerfume } = require('../utils/perfume');

const router = express.Router();

async function ensurePerfume(perfumeId) {
  const [rows] = await pool.query('SELECT id FROM perfumes WHERE id = ?', [perfumeId]);
  if (rows.length === 0) throw new HttpError(404, '향수를 찾을 수 없습니다.');
}

// 인기 순위: GET /api/favorites/ranking?limit=5  (로그인 불필요)
router.get(
  '/ranking',
  asyncHandler(async (req, res) => {
    const limit = req.query.limit === undefined ? 5 : toInt(req.query.limit, 'limit', { min: 1, max: 20 });
    const [rows] = await pool.query(
      `SELECT p.id, p.brand, p.name, p.image, COUNT(f.id) AS favorite_count
         FROM favorites f
         JOIN perfumes p ON p.id = f.perfume_id
        GROUP BY p.id, p.brand, p.name, p.image
        ORDER BY favorite_count DESC, p.id ASC
        LIMIT ?`,
      [limit]
    );
    ok(
      res,
      rows.map((r, i) => ({
        rank: i + 1,
        id: r.id,
        brand: r.brand,
        name: r.name,
        image: r.image,
        favoriteCount: Number(r.favorite_count),
      }))
    );
  })
);

// 내 찜 목록: GET /api/favorites
router.get(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT p.*, f.created_at AS favorited_at
         FROM favorites f
         JOIN perfumes p ON p.id = f.perfume_id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC, f.id DESC`,
      [req.user.id]
    );
    ok(res, rows.map((r) => ({ ...toPerfume(r), favoritedAt: r.favorited_at })));
  })
);

// 찜 여부: GET /api/favorites/:perfumeId/check
router.get(
  '/:perfumeId/check',
  auth,
  asyncHandler(async (req, res) => {
    const { perfumeId } = req.params;
    await ensurePerfume(perfumeId);
    const [rows] = await pool.query('SELECT id FROM favorites WHERE user_id = ? AND perfume_id = ?', [
      req.user.id,
      perfumeId,
    ]);
    ok(res, { perfumeId, isFavorite: rows.length > 0 });
  })
);

// ★ 찜 추가: POST /api/favorites/:perfumeId
router.post(
  '/:perfumeId',
  auth,
  asyncHandler(async (req, res) => {
    const { perfumeId } = req.params;
    await ensurePerfume(perfumeId);
    try {
      await pool.query('INSERT INTO favorites (user_id, perfume_id) VALUES (?, ?)', [req.user.id, perfumeId]);
    } catch (err) {
      // (user_id, perfume_id) UNIQUE 제약 위반 → 이미 찜한 향수
      if (err.code === 'ER_DUP_ENTRY') throw new HttpError(409, '이미 찜한 향수입니다.');
      throw err;
    }
    ok(res, { perfumeId, isFavorite: true }, 201);
  })
);

// ★ 찜 해제: DELETE /api/favorites/:perfumeId
router.delete(
  '/:perfumeId',
  auth,
  asyncHandler(async (req, res) => {
    const { perfumeId } = req.params;
    const [result] = await pool.query('DELETE FROM favorites WHERE user_id = ? AND perfume_id = ?', [
      req.user.id,
      perfumeId,
    ]);
    if (result.affectedRows === 0) throw new HttpError(404, '찜한 향수가 아닙니다.');
    ok(res, { perfumeId, isFavorite: false });
  })
);

// 전체 비우기: DELETE /api/favorites
router.delete(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const [result] = await pool.query('DELETE FROM favorites WHERE user_id = ?', [req.user.id]);
    ok(res, { deletedCount: result.affectedRows });
  })
);

module.exports = router;
