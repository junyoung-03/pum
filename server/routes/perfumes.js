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
//       아래에 두면 Express가 'featured'를 향수 id로 인식합니다.
const express = require('express');
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middlewares/auth');
const { HttpError, asyncHandler, ok, parsePaging, pagination, toInt, requireText } = require('../utils/http');
const { CATEGORIES, MOODS, SEASONS, PURPOSES, PRICE_LEVELS } = require('../utils/constants');
const { toPerfume, parseJson } = require('../utils/perfume');

const router = express.Router();

async function findPerfume(id) {
  const [rows] = await pool.query('SELECT * FROM perfumes WHERE id = ?', [id]);
  if (rows.length === 0) throw new HttpError(404, '향수를 찾을 수 없습니다.');
  return rows[0];
}

/**
 * 유사도 점수 (프론트 DetailPage.tsx의 getSimilarPerfumes와 같은 기준)
 *   - 향 계열(category)이 같으면 +3
 *   - 무드(mood)가 겹치는 개수 × 1
 *   - 계절(season)이 겹치는 개수 × 0.5
 */
function similarityScore(base, other) {
  const baseMood = parseJson(base.mood);
  const baseSeason = parseJson(base.season);
  let score = 0;
  if (other.category === base.category) score += 3;
  score += parseJson(other.mood).filter((m) => baseMood.includes(m)).length;
  score += parseJson(other.season).filter((s) => baseSeason.includes(s)).length * 0.5;
  return score;
}

// 등록·수정 요청 본문 → DB 컬럼 값 (전달된 필드만)
const ARRAY_FIELDS = {
  mood: ['mood', MOODS],
  moodTags: ['mood_tags', null],
  season: ['season', SEASONS],
  purpose: ['purpose', PURPOSES],
  topNote: ['top_note', null],
  middleNote: ['middle_note', null],
  baseNote: ['base_note', null],
};
const TEXT_FIELDS = {
  name: ['name', 100],
  brand: ['brand', 50],
  noteFamily: ['note_family', 100],
  description: ['description', 2000],
  highlight: ['highlight', 255],
  image: ['image', 255],
  color: ['color', 20],
  shortCopy: ['short_copy', 255],
};

function bodyToColumns(body) {
  const cols = {};
  for (const [field, [col, max]] of Object.entries(TEXT_FIELDS)) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== 'string' || body[field].length > max) {
      throw new HttpError(400, `${field}는 ${max}자 이하 문자열이어야 합니다.`);
    }
    cols[col] = body[field].trim();
  }
  for (const [field, [col, allowed]] of Object.entries(ARRAY_FIELDS)) {
    if (body[field] === undefined) continue;
    const arr = body[field];
    if (!Array.isArray(arr) || arr.some((v) => typeof v !== 'string')) {
      throw new HttpError(400, `${field}는 문자열 배열이어야 합니다.`);
    }
    if (allowed && arr.some((v) => !allowed.includes(v))) {
      throw new HttpError(400, `${field} 값은 ${allowed.join(', ')} 중에서 선택해 주세요.`);
    }
    cols[col] = JSON.stringify(arr);
  }
  if (body.category !== undefined) {
    if (!CATEGORIES.includes(body.category)) throw new HttpError(400, `category는 ${CATEGORIES.join(', ')} 중 하나여야 합니다.`);
    cols.category = body.category;
  }
  if (body.price !== undefined) {
    if (!PRICE_LEVELS.includes(body.price)) throw new HttpError(400, `price는 ${PRICE_LEVELS.join(', ')} 중 하나여야 합니다.`);
    cols.price_level = body.price;
  }
  if (body.featured !== undefined) {
    if (typeof body.featured !== 'boolean') throw new HttpError(400, 'featured는 true 또는 false여야 합니다.');
    cols.is_featured = body.featured ? 1 : 0;
  }
  if (body.featuredOrder !== undefined) {
    cols.featured_order = body.featuredOrder === null ? null : toInt(body.featuredOrder, 'featuredOrder', { min: 1 });
  }
  return cols;
}

// ★ 목록 조회: GET /api/perfumes?q=&category=&mood=&season=&page=&limit=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q, category, mood, season } = req.query;
    const { page, limit, offset } = parsePaging(req.query, 20, 50);

    const where = [];
    const params = [];
    if (q) {
      where.push('(name LIKE ? OR brand LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    if (category) {
      if (!CATEGORIES.includes(category)) throw new HttpError(400, `category는 ${CATEGORIES.join(', ')} 중 하나여야 합니다.`);
      where.push('category = ?');
      params.push(category);
    }
    if (mood) {
      if (!MOODS.includes(mood)) throw new HttpError(400, `mood는 ${MOODS.join(', ')} 중 하나여야 합니다.`);
      where.push('JSON_CONTAINS(mood, JSON_QUOTE(?))');
      params.push(mood);
    }
    if (season) {
      if (!SEASONS.includes(season)) throw new HttpError(400, `season은 ${SEASONS.join(', ')} 중 하나여야 합니다.`);
      where.push('JSON_CONTAINS(season, JSON_QUOTE(?))');
      params.push(season);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM perfumes ${whereSql}`, params);
    const [rows] = await pool.query(
      `SELECT * FROM perfumes ${whereSql} ORDER BY sort_order ASC, id ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    ok(res, rows.map(toPerfume), 200, { pagination: pagination(page, limit, total) });
  })
);

// 대표 향수 3종: GET /api/perfumes/featured
router.get(
  '/featured',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT id, brand, name, short_copy, image, color, featured_order
         FROM perfumes
        WHERE is_featured = 1
        ORDER BY featured_order ASC
        LIMIT 3`
    );
    // 대표 향수가 없어도 오류가 아니므로 빈 배열 + 200
    ok(
      res,
      rows.map((r) => ({
        id: r.id,
        brand: r.brand,
        name: r.name,
        shortCopy: r.short_copy,
        image: r.image,
        color: r.color,
        featuredOrder: r.featured_order,
      }))
    );
  })
);

// ★ 상세 조회: GET /api/perfumes/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await findPerfume(req.params.id);
    ok(res, toPerfume(row));
  })
);

// 비슷한 향수: GET /api/perfumes/:id/similar?limit=3
router.get(
  '/:id/similar',
  asyncHandler(async (req, res) => {
    const limit = req.query.limit === undefined ? 3 : toInt(req.query.limit, 'limit', { min: 1, max: 10 });

    // 1) 기준 향수 조회 (없으면 404)
    const base = await findPerfume(req.params.id);
    // 2) 기준 향수를 뺀 나머지 조회
    const [others] = await pool.query('SELECT * FROM perfumes WHERE id <> ?', [base.id]);
    // 3) 점수 계산 → 4) 점수 내림차순, 동점이면 id 오름차순 → limit개
    const result = others
      .map((p) => ({
        id: p.id,
        brand: p.brand,
        name: p.name,
        image: p.image,
        category: p.category,
        similarity: similarityScore(base, p),
      }))
      .sort((a, b) => b.similarity - a.similarity || a.id.localeCompare(b.id))
      .slice(0, limit);

    ok(res, result, 200, { base: { id: base.id, brand: base.brand, name: base.name } });
  })
);

// 향수 등록 (관리자): POST /api/perfumes
router.post(
  '/',
  auth,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { id } = req.body;
    if (typeof id !== 'string' || !/^[a-z0-9-]{2,50}$/.test(id)) {
      throw new HttpError(400, 'id는 영문 소문자·숫자·하이픈(-)으로 2~50자여야 합니다. 예: chanel-no5');
    }
    requireText(req.body.name, 'name', 100);
    requireText(req.body.brand, 'brand', 50);
    if (req.body.category === undefined) throw new HttpError(400, 'category를 입력해 주세요.');

    const cols = bodyToColumns(req.body);
    // 배열 컬럼은 NOT NULL이므로 값이 없으면 빈 배열
    for (const [col] of Object.values(ARRAY_FIELDS)) if (cols[col] === undefined) cols[col] = '[]';

    const [exists] = await pool.query('SELECT id FROM perfumes WHERE id = ?', [id]);
    if (exists.length > 0) throw new HttpError(409, '이미 존재하는 향수 id입니다.');

    const [[{ nextOrder }]] = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS nextOrder FROM perfumes');
    const data = { id, ...cols, sort_order: nextOrder };
    await pool.query('INSERT INTO perfumes SET ?', [data]);

    ok(res, toPerfume(await findPerfume(id)), 201);
  })
);

// 향수 수정 (관리자): PUT /api/perfumes/:id
router.put(
  '/:id',
  auth,
  adminOnly,
  asyncHandler(async (req, res) => {
    await findPerfume(req.params.id);
    const cols = bodyToColumns(req.body);
    if (Object.keys(cols).length === 0) throw new HttpError(400, '수정할 항목을 입력해 주세요.');
    if (cols.name === '' || cols.brand === '') throw new HttpError(400, 'name과 brand는 비워 둘 수 없습니다.');

    await pool.query('UPDATE perfumes SET ? WHERE id = ?', [cols, req.params.id]);
    ok(res, toPerfume(await findPerfume(req.params.id)));
  })
);

// 향수 삭제 (관리자): DELETE /api/perfumes/:id
router.delete(
  '/:id',
  auth,
  adminOnly,
  asyncHandler(async (req, res) => {
    await findPerfume(req.params.id);
    await pool.query('DELETE FROM perfumes WHERE id = ?', [req.params.id]);
    ok(res, { id: req.params.id, message: '향수가 삭제되었습니다.' });
  })
);

module.exports = router;
