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
const pool = require('../db/pool');
const { auth } = require('../middlewares/auth');
const { HttpError, asyncHandler, ok, parsePaging, pagination, toInt, requireText } = require('../utils/http');
const { CATEGORIES, MARKET_STATUS } = require('../utils/constants');

const router = express.Router();

const SELECT_POST = `
  SELECT m.*, u.nickname, o.id AS order_id, o.stage AS order_stage, o.buyer_id AS order_buyer_id
    FROM market_posts m
    JOIN users u ON u.id = m.user_id
    LEFT JOIN orders o ON o.post_id = m.id`;

const toPost = (row) => ({
  id: row.id,
  title: row.title,
  perfumeId: row.perfume_id,
  brand: row.brand,
  category: row.category,
  volumeMl: row.volume_ml,
  remainPercent: row.remain_percent,
  price: row.price,
  content: row.content,
  status: row.status,
  seller: { id: row.user_id, nickname: row.nickname },
  // 거래 진행 정보 (구매자 개인정보는 포함하지 않음)
  order: row.order_id ? { id: row.order_id, stage: row.order_stage, buyerId: row.order_buyer_id } : null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

async function findPost(id) {
  const [rows] = await pool.query(`${SELECT_POST} WHERE m.id = ?`, [id]);
  if (rows.length === 0) throw new HttpError(404, '판매글을 찾을 수 없습니다.');
  return rows[0];
}

async function findOwnPost(id, userId) {
  const post = await findPost(id);
  if (post.user_id !== userId) throw new HttpError(403, '본인이 작성한 판매글만 수정·삭제할 수 있습니다.');
  return post;
}

// 구매 신청이 들어온 판매글은 수정·상태 변경·삭제 불가 (409)
function checkNoOrder(post) {
  if (post.order_id) {
    throw new HttpError(409, '구매 신청이 들어온 판매글은 수정·삭제하거나 상태를 직접 바꿀 수 없습니다. (거래 단계에 따라 자동 변경)');
  }
}

/**
 * 등록·수정 본문 검사 → DB 컬럼 값
 * isCreate가 true이면 필수 값(title, volumeMl, remainPercent, price)을 확인
 * perfumeId를 넣으면 brand·category를 향수 정보에서 자동으로 채움
 */
async function bodyToColumns(body, isCreate) {
  const cols = {};

  if (isCreate || body.title !== undefined) cols.title = requireText(body.title, '제목(title)', 100);

  if (body.perfumeId !== undefined && body.perfumeId !== null && body.perfumeId !== '') {
    const [rows] = await pool.query('SELECT id, brand, category FROM perfumes WHERE id = ?', [body.perfumeId]);
    if (rows.length === 0) throw new HttpError(404, '연결할 향수를 찾을 수 없습니다.');
    cols.perfume_id = rows[0].id;
    if (body.brand === undefined) cols.brand = rows[0].brand;
    if (body.category === undefined) cols.category = rows[0].category;
  } else if (body.perfumeId === null || body.perfumeId === '') {
    cols.perfume_id = null;
  }

  if (body.brand !== undefined) cols.brand = requireText(body.brand, '브랜드(brand)', 50);
  if (isCreate && !cols.brand) throw new HttpError(400, '브랜드(brand)를 입력하거나 perfumeId를 선택해 주세요.');

  if (body.category !== undefined) {
    if (body.category === null || body.category === '') {
      cols.category = null;
    } else {
      if (!CATEGORIES.includes(body.category)) throw new HttpError(400, `category는 ${CATEGORIES.join(', ')} 중 하나여야 합니다.`);
      cols.category = body.category;
    }
  }

  if (isCreate || body.volumeMl !== undefined) cols.volume_ml = toInt(body.volumeMl, '용량(volumeMl)', { min: 1, max: 1000 });
  if (isCreate || body.remainPercent !== undefined) {
    cols.remain_percent = toInt(body.remainPercent, '잔량(remainPercent)', { min: 1, max: 100 });
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

// 목록: GET /api/market?brand=&category=&minPrice=&maxPrice=&status=&sort=latest|priceAsc|priceDesc&page=&limit=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { brand, category, status, sort = 'latest' } = req.query;
    const { page, limit, offset } = parsePaging(req.query, 10, 50);

    const where = [];
    const params = [];
    if (brand) {
      where.push('m.brand = ?');
      params.push(brand);
    }
    if (category) {
      if (!CATEGORIES.includes(category)) throw new HttpError(400, `category는 ${CATEGORIES.join(', ')} 중 하나여야 합니다.`);
      where.push('m.category = ?');
      params.push(category);
    }
    if (status) {
      if (!MARKET_STATUS.includes(status)) throw new HttpError(400, `status는 ${MARKET_STATUS.join(', ')} 중 하나여야 합니다.`);
      where.push('m.status = ?');
      params.push(status);
    }
    const minPrice =
      req.query.minPrice !== undefined && req.query.minPrice !== '' ? toInt(req.query.minPrice, 'minPrice', { min: 0 }) : null;
    const maxPrice =
      req.query.maxPrice !== undefined && req.query.maxPrice !== '' ? toInt(req.query.maxPrice, 'maxPrice', { min: 0 }) : null;
    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      throw new HttpError(400, 'minPrice는 maxPrice보다 클 수 없습니다.');
    }
    if (minPrice !== null) {
      where.push('m.price >= ?');
      params.push(minPrice);
    }
    if (maxPrice !== null) {
      where.push('m.price <= ?');
      params.push(maxPrice);
    }

    const orderBy = {
      latest: 'm.created_at DESC, m.id DESC',
      priceAsc: 'm.price ASC, m.id DESC',
      priceDesc: 'm.price DESC, m.id DESC',
    }[sort];
    if (!orderBy) throw new HttpError(400, 'sort는 latest, priceAsc, priceDesc 중 하나여야 합니다.');

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM market_posts m ${whereSql}`, params);
    const [rows] = await pool.query(`${SELECT_POST} ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [
      ...params,
      limit,
      offset,
    ]);
    ok(res, rows.map(toPost), 200, { pagination: pagination(page, limit, total) });
  })
);

// 내 판매글: GET /api/market/my
router.get(
  '/my',
  auth,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(`${SELECT_POST} WHERE m.user_id = ? ORDER BY m.created_at DESC, m.id DESC`, [
      req.user.id,
    ]);
    ok(res, rows.map(toPost));
  })
);

// 상세: GET /api/market/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    ok(res, toPost(await findPost(req.params.id)));
  })
);

// ★ 등록: POST /api/market  { title, perfumeId?, brand?, category?, volumeMl, remainPercent, price, content? }
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const cols = await bodyToColumns(req.body, true);
    const [result] = await pool.query('INSERT INTO market_posts SET ?', [{ ...cols, user_id: req.user.id }]);
    ok(res, toPost(await findPost(result.insertId)), 201);
  })
);

// 수정: PUT /api/market/:id
router.put(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    checkNoOrder(await findOwnPost(req.params.id, req.user.id));
    if (req.body.status !== undefined) {
      throw new HttpError(400, '거래 상태는 PATCH /api/market/:id/status로 변경해 주세요.');
    }
    const cols = await bodyToColumns(req.body, false);
    if (Object.keys(cols).length === 0) throw new HttpError(400, '수정할 항목을 입력해 주세요.');
    await pool.query('UPDATE market_posts SET ? WHERE id = ?', [cols, req.params.id]);
    ok(res, toPost(await findPost(req.params.id)));
  })
);

// 거래 상태 변경: PATCH /api/market/:id/status  { status }
router.patch(
  '/:id/status',
  auth,
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!MARKET_STATUS.includes(status)) throw new HttpError(400, `status는 ${MARKET_STATUS.join(', ')} 중 하나여야 합니다.`);
    checkNoOrder(await findOwnPost(req.params.id, req.user.id));
    await pool.query('UPDATE market_posts SET status = ? WHERE id = ?', [status, req.params.id]);
    ok(res, toPost(await findPost(req.params.id)));
  })
);

// 삭제: DELETE /api/market/:id
router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    checkNoOrder(await findOwnPost(req.params.id, req.user.id));
    await pool.query('DELETE FROM market_posts WHERE id = ?', [req.params.id]);
    ok(res, { id: Number(req.params.id), message: '판매글이 삭제되었습니다.' });
  })
);

module.exports = router;
