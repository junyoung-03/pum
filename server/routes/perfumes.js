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
const { Op, Sequelize } = require('sequelize');
const { Perfume } = require('../models');
const { auth, adminOnly } = require('../middlewares/auth');
const { HttpError, asyncHandler, ok, parsePaging, pagination, toInt, requireText } = require('../utils/http');
const { CATEGORIES, MOODS, SEASONS, PURPOSES, PRICE_LEVELS } = require('../utils/constants');

const router = express.Router();

async function findPerfume(id) {
  const perfume = await Perfume.findByPk(id);
  if (!perfume) throw new HttpError(404, '향수를 찾을 수 없습니다.');
  return perfume;
}

/**
 * 유사도 점수 (프론트 DetailPage.tsx의 getSimilarPerfumes와 같은 기준)
 *   - 향 계열(category)이 같으면 +3
 *   - 무드(mood)가 겹치는 개수 × 1
 *   - 계절(season)이 겹치는 개수 × 0.5
 */
function similarityScore(base, other) {
  const baseMood = Array.isArray(base.mood) ? base.mood : [];
  const baseSeason = Array.isArray(base.season) ? base.season : [];
  const otherMood = Array.isArray(other.mood) ? other.mood : [];
  const otherSeason = Array.isArray(other.season) ? other.season : [];
  let score = 0;
  if (other.category === base.category) score += 3;
  score += otherMood.filter((m) => baseMood.includes(m)).length;
  score += otherSeason.filter((s) => baseSeason.includes(s)).length * 0.5;
  return score;
}

const ARRAY_FIELDS = {
  mood: ['mood', MOODS],
  moodTags: ['moodTags', null],
  season: ['season', SEASONS],
  purpose: ['purpose', PURPOSES],
  topNote: ['topNote', null],
  middleNote: ['middleNote', null],
  baseNote: ['baseNote', null],
};
const TEXT_FIELDS = {
  name: ['name', 100],
  brand: ['brand', 50],
  noteFamily: ['noteFamily', 100],
  description: ['description', 2000],
  highlight: ['highlight', 255],
  image: ['image', 255],
  color: ['color', 20],
  shortCopy: ['shortCopy', 255],
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
    cols[col] = arr;
  }
  if (body.category !== undefined) {
    if (!CATEGORIES.includes(body.category)) throw new HttpError(400, `category는 ${CATEGORIES.join(', ')} 중 하나여야 합니다.`);
    cols.category = body.category;
  }
  if (body.price !== undefined) {
    if (!PRICE_LEVELS.includes(body.price)) throw new HttpError(400, `price는 ${PRICE_LEVELS.join(', ')} 중 하나여야 합니다.`);
    cols.priceLevel = body.price;
  }
  if (body.featured !== undefined) {
    if (typeof body.featured !== 'boolean') throw new HttpError(400, 'featured는 true 또는 false여야 합니다.');
    cols.isFeatured = body.featured;
  }
  if (body.featuredOrder !== undefined) {
    cols.featuredOrder = body.featuredOrder === null ? null : toInt(body.featuredOrder, 'featuredOrder', { min: 1 });
  }
  return cols;
}

/**
 * [핵심 API 1] 향수 목록 조회 (다중 조건 필터링 및 페이징)
 * - Method / Path: GET /api/perfumes
 * - Query Params: q(검색어), category(향 계열), mood(분위기), season(계절), page(페이지), limit(개수)
 * - 핵심 로직: Sequelize 다중 조건 및 JSON_CONTAINS를 활용한 고속 필터링
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q, category, mood, season } = req.query;
    const { page, limit, offset } = parsePaging(req.query, 20, 50);

    const conditions = [];
    if (q) {
      conditions.push({
        [Op.or]: [
          { name: { [Op.like]: `%${q}%` } },
          { brand: { [Op.like]: `%${q}%` } },
        ],
      });
    }
    if (category) {
      if (!CATEGORIES.includes(category)) throw new HttpError(400, `category는 ${CATEGORIES.join(', ')} 중 하나여야 합니다.`);
      conditions.push({ category });
    }
    if (mood) {
      if (!MOODS.includes(mood)) throw new HttpError(400, `mood는 ${MOODS.join(', ')} 중 하나여야 합니다.`);
      conditions.push(Sequelize.where(Sequelize.fn('JSON_CONTAINS', Sequelize.col('mood'), JSON.stringify(mood)), 1));
    }
    if (season) {
      if (!SEASONS.includes(season)) throw new HttpError(400, `season은 ${SEASONS.join(', ')} 중 하나여야 합니다.`);
      conditions.push(Sequelize.where(Sequelize.fn('JSON_CONTAINS', Sequelize.col('season'), JSON.stringify(season)), 1));
    }

    const where = conditions.length > 0 ? { [Op.and]: conditions } : {};

    const { count: total, rows: perfumes } = await Perfume.findAndCountAll({
      where,
      order: [['sortOrder', 'ASC'], ['id', 'ASC']],
      limit,
      offset,
    });

    ok(res, perfumes, 200, { pagination: pagination(page, limit, total) });
  })
);

/**
 * [핵심 API 2] 홈 화면 대표 향수 3종 조회 (Featured Showcase)
 * - Method / Path: GET /api/perfumes/featured
 * - 핵심 로직: 관리자가 지정한 대표 향수(`isFeatured = true`) 중 `featuredOrder` 순으로 상위 3개를 추출하여 메인 홈 배너에 전달
 */
router.get(
  '/featured',
  asyncHandler(async (req, res) => {
    const rows = await Perfume.findAll({
      attributes: ['id', 'brand', 'name', 'shortCopy', 'image', 'color', 'featuredOrder'],
      where: { isFeatured: true },
      order: [['featuredOrder', 'ASC']],
      limit: 3,
    });
    ok(res, rows);
  })
);

/**
 * [핵심 API 3] 향수 단건 상세 조회
 * - Method / Path: GET /api/perfumes/:id
 * - 핵심 로직: id로 단건 조회 후 Sequelize 모델 인스턴스 반환 (자동 camelCase 및 JSON 파싱 완료)
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const perfume = await findPerfume(req.params.id);
    ok(res, perfume);
  })
);

/**
 * [핵심 API 4] 비슷한 향수 추천 알고리즘 (Similarity Recommendation)
 * - Method / Path: GET /api/perfumes/:id/similar?limit=3
 * - 핵심 로직:
 *   1) 기준 향수와 타 향수들을 비교하여 가중치 유사도 점수 산출
 *      (동일 향 계열 +3점, 무드 일치 개수 × 1점, 계절 일치 개수 × 0.5점)
 *   2) 유사도 점수 내림차순으로 상위 N개 추천
 */
router.get(
  '/:id/similar',
  asyncHandler(async (req, res) => {
    const limit = req.query.limit === undefined ? 3 : toInt(req.query.limit, 'limit', { min: 1, max: 10 });

    const base = await findPerfume(req.params.id);
    const others = await Perfume.findAll({
      where: { id: { [Op.ne]: base.id } },
    });

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

/**
 * [관리자 API] 신규 향수 등록
 * - Method / Path: POST /api/perfumes
 * - Auth: 관리자 전용 (adminOnly)
 * - Request Body: { id, name, brand, category, price, mood, season, ... }
 * - 핵심 로직: 영문 slug 형태 id 유효성 검사, 중복 id 체크(409), Sequelize create로 저장
 */
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
    for (const field of Object.keys(ARRAY_FIELDS)) {
      if (cols[field] === undefined) cols[field] = [];
    }

    const exists = await Perfume.findByPk(id, { attributes: ['id'] });
    if (exists) throw new HttpError(409, '이미 존재하는 향수 id입니다.');

    const maxOrder = await Perfume.max('sortOrder');
    const nextOrder = (maxOrder || 0) + 1;

    const created = await Perfume.create({ id, ...cols, sortOrder: nextOrder });
    ok(res, created, 201);
  })
);

/**
 * [관리자 API] 향수 정보 수정
 * - Method / Path: PUT /api/perfumes/:id
 * - Auth: 관리자 전용 (adminOnly)
 * - Request Body: 수정할 필드들 (부분 업데이트 지원)
 * - 핵심 로직: 전달된 필드만 추출하여 Sequelize update 실행
 */
router.put(
  '/:id',
  auth,
  adminOnly,
  asyncHandler(async (req, res) => {
    const perfume = await findPerfume(req.params.id);
    const cols = bodyToColumns(req.body);
    if (Object.keys(cols).length === 0) throw new HttpError(400, '수정할 항목을 입력해 주세요.');
    if (cols.name === '' || cols.brand === '') throw new HttpError(400, 'name과 brand는 비워 둘 수 없습니다.');

    await perfume.update(cols);
    ok(res, perfume);
  })
);

/**
 * [관리자 API] 향수 삭제
 * - Method / Path: DELETE /api/perfumes/:id
 * - Auth: 관리자 전용 (adminOnly)
 * - 핵심 로직: 향수 삭제 시 DB 외래키 CASCADE 설정에 의해 연관된 리뷰와 찜 데이터도 자동 연쇄 삭제
 */
router.delete(
  '/:id',
  auth,
  adminOnly,
  asyncHandler(async (req, res) => {
    const perfume = await findPerfume(req.params.id);
    await perfume.destroy();
    ok(res, { id: req.params.id, message: '향수가 삭제되었습니다.' });
  })
);

module.exports = router;
