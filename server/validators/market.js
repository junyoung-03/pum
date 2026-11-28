const { HttpError, parsePaging, toInt, requireText } = require('../utils/http');
const { CATEGORIES, MARKET_STATUS } = require('../utils/constants');

function parseMarketFields(body, isCreate) {
  const cols = {};

  if (isCreate || body.title !== undefined) {
    cols.title = requireText(body.title, '제목(title)', 100);
  }
  if (body.perfumeId !== undefined && body.perfumeId !== null && body.perfumeId !== '') {
    cols.perfumeId = body.perfumeId;
  } else if (body.perfumeId === null || body.perfumeId === '') {
    cols.perfumeId = null;
  }

  if (body.brand !== undefined) cols.brand = requireText(body.brand, '브랜드(brand)', 50);
  if (isCreate && !cols.brand && !cols.perfumeId) {
    throw new HttpError(400, '브랜드(brand)를 입력하거나 perfumeId를 선택해 주세요.');
  }

  if (body.category !== undefined) {
    if (body.category === null || body.category === '') {
      cols.category = null;
    } else {
      if (!CATEGORIES.includes(body.category)) {
        throw new HttpError(400, `category는 ${CATEGORIES.join(', ')} 중 하나여야 합니다.`);
      }
      cols.category = body.category;
    }
  }

  if (isCreate || body.volumeMl !== undefined) {
    cols.volumeMl = toInt(body.volumeMl, '용량(volumeMl)', { min: 1, max: 1000 });
  }
  if (isCreate || body.remainPercent !== undefined) {
    cols.remainPercent = toInt(body.remainPercent, '잔량(remainPercent)', { min: 1, max: 100 });
  }
  if (isCreate || body.price !== undefined) {
    cols.price = toInt(body.price, '가격(price)', { min: 0, max: 100000000 });
  }

  if (body.content !== undefined) {
    if (typeof body.content !== 'string' || body.content.length > 2000) {
      throw new HttpError(400, '내용(content)은 2000자 이하로 입력해 주세요.');
    }
    cols.content = body.content.trim();
  }
  return cols;
}

exports.validateMarketQuery = (req, res, next) => {
  const { brand, category, status, sort = 'latest' } = req.query;
  const { page, limit, offset } = parsePaging(req.query, 10, 50);

  if (category && !CATEGORIES.includes(category)) {
    throw new HttpError(400, `category는 ${CATEGORIES.join(', ')} 중 하나여야 합니다.`);
  }
  if (status && !MARKET_STATUS.includes(status)) {
    throw new HttpError(400, `status는 ${MARKET_STATUS.join(', ')} 중 하나여야 합니다.`);
  }

  const minPrice = req.query.minPrice !== undefined && req.query.minPrice !== ''
    ? toInt(req.query.minPrice, 'minPrice', { min: 0 })
    : null;
  const maxPrice = req.query.maxPrice !== undefined && req.query.maxPrice !== ''
    ? toInt(req.query.maxPrice, 'maxPrice', { min: 0 })
    : null;

  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    throw new HttpError(400, 'minPrice는 maxPrice보다 클 수 없습니다.');
  }
  if (!['latest', 'priceAsc', 'priceDesc'].includes(sort)) {
    throw new HttpError(400, 'sort는 latest, priceAsc, priceDesc 중 하나여야 합니다.');
  }

  req.validatedQuery = { brand, category, status, sort, minPrice, maxPrice, page, limit, offset };
  next();
};

exports.validateCreatePost = (req, res, next) => {
  req.validated = parseMarketFields(req.body, true);
  next();
};

exports.validateUpdatePost = (req, res, next) => {
  if (req.body.status !== undefined) {
    throw new HttpError(400, '거래 상태는 PATCH /api/market/:id/status로 변경해 주세요.');
  }
  const cols = parseMarketFields(req.body, false);
  if (Object.keys(cols).length === 0) {
    throw new HttpError(400, '수정할 항목을 입력해 주세요.');
  }
  req.validated = cols;
  next();
};

exports.validatePostStatus = (req, res, next) => {
  const { status } = req.body;
  if (!MARKET_STATUS.includes(status)) {
    throw new HttpError(400, `status는 ${MARKET_STATUS.join(', ')} 중 하나여야 합니다.`);
  }
  req.validated = { status };
  next();
};
