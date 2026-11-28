const { HttpError, parsePaging, toInt, requireText } = require('../utils/http');
const { CATEGORIES, MOODS, SEASONS, PURPOSES, PRICE_LEVELS } = require('../utils/constants');

const ARRAY_FIELDS = {
  mood: MOODS,
  moodTags: null,
  season: SEASONS,
  purpose: PURPOSES,
  topNote: null,
  middleNote: null,
  baseNote: null,
};

const TEXT_FIELDS = {
  name: 100,
  brand: 50,
  noteFamily: 100,
  description: 2000,
  highlight: 255,
  image: 255,
  color: 20,
  shortCopy: 255,
};

function parsePerfumeFields(body) {
  const cols = {};
  for (const [field, max] of Object.entries(TEXT_FIELDS)) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== 'string' || body[field].length > max) {
      throw new HttpError(400, `${field}는 ${max}자 이하 문자열이어야 합니다.`);
    }
    cols[field] = body[field].trim();
  }
  for (const [field, allowed] of Object.entries(ARRAY_FIELDS)) {
    if (body[field] === undefined) continue;
    const arr = body[field];
    if (!Array.isArray(arr) || arr.some((v) => typeof v !== 'string')) {
      throw new HttpError(400, `${field}는 문자열 배열이어야 합니다.`);
    }
    if (allowed && arr.some((v) => !allowed.includes(v))) {
      throw new HttpError(400, `${field} 값은 ${allowed.join(', ')} 중에서 선택해 주세요.`);
    }
    cols[field] = arr;
  }
  if (body.category !== undefined) {
    if (!CATEGORIES.includes(body.category)) {
      throw new HttpError(400, `category는 ${CATEGORIES.join(', ')} 중 하나여야 합니다.`);
    }
    cols.category = body.category;
  }
  if (body.price !== undefined) {
    if (!PRICE_LEVELS.includes(body.price)) {
      throw new HttpError(400, `price는 ${PRICE_LEVELS.join(', ')} 중 하나여야 합니다.`);
    }
    cols.priceLevel = body.price;
  }
  if (body.featured !== undefined) {
    if (typeof body.featured !== 'boolean') {
      throw new HttpError(400, 'featured는 true 또는 false여야 합니다.');
    }
    cols.isFeatured = body.featured;
  }
  if (body.featuredOrder !== undefined) {
    cols.featuredOrder = body.featuredOrder === null
      ? null
      : toInt(body.featuredOrder, 'featuredOrder', { min: 1 });
  }
  return cols;
}

exports.validatePerfumeQuery = (req, res, next) => {
  const { q, category, mood, season } = req.query;
  const { page, limit, offset } = parsePaging(req.query, 20, 50);

  for (const [key, allowed] of Object.entries({ category: CATEGORIES, mood: MOODS, season: SEASONS })) {
    if (req.query[key] && !allowed.includes(req.query[key])) {
      throw new HttpError(400, `${key}는 ${allowed.join(', ')} 중 하나여야 합니다.`);
    }
  }
  req.validatedQuery = { q, category, mood, season, page, limit, offset };
  next();
};

exports.validateCreatePerfume = (req, res, next) => {
  const { id } = req.body;
  if (typeof id !== 'string' || !/^[a-z0-9-]{2,50}$/.test(id)) {
    throw new HttpError(400, 'id는 영문 소문자·숫자·하이픈(-)으로 2~50자여야 합니다. 예: chanel-no5');
  }
  requireText(req.body.name, 'name', 100);
  requireText(req.body.brand, 'brand', 50);
  if (req.body.category === undefined) throw new HttpError(400, 'category를 입력해 주세요.');

  req.validated = { id, cols: parsePerfumeFields(req.body) };
  next();
};

exports.validateUpdatePerfume = (req, res, next) => {
  const cols = parsePerfumeFields(req.body);
  if (Object.keys(cols).length === 0) throw new HttpError(400, '수정할 항목을 입력해 주세요.');
  if (cols.name === '' || cols.brand === '') throw new HttpError(400, 'name과 brand는 비워 둘 수 없습니다.');

  req.validated = cols;
  next();
};
