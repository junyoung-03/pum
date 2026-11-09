// 6. 거래 라우터 /api/orders  (11개)
// 중고 판매글을 관리자(회사)가 중개하는 안전거래
//   구매신청 → 판매자발송 → 인수완료(물품 인수) → 인계완료(물품 인계)
//
// POST   /               ★ 구매 신청 { postId, name, phone, address } (로그인) → 판매글 '예약중'
// GET    /my               내 구매 목록 (로그인, 구매자)
// GET    /sales            내 판매 거래 목록 (로그인, 판매자) → 구매자 개인정보는 보이지 않음
// GET    /                 전체 거래 목록 (관리자, ?stage= 필터)
// GET    /:id              거래 상세 (구매자·판매자·관리자) → 개인정보는 구매자·관리자만
// PATCH  /:id/ship         판매자 발송: 판매자가 물품을 관리자에게 보냄 (구매신청 → 판매자발송)
// PATCH  /:id/receive     ★ 물품 인수: 관리자가 물품·대금 수령 확인 (판매자발송 → 인수완료)
// PATCH  /:id/deliver     ★ 물품 인계: 관리자가 구매자에게 발송 (인수완료 → 인계완료) → 판매글 '판매완료'
// DELETE /:id/receive      물품 인수 취소 (관리자): 인수완료 → 판매자발송
// DELETE /:id/deliver      물품 인계 취소 (관리자): 인계완료 → 인수완료, 판매글 '판매완료' → '예약중'
// DELETE /:id              거래 취소 → 판매글 '판매중'
//                            구매자: 판매자가 발송하기 전(구매신청)까지만
//                            관리자: 인계하기 전(구매신청·판매자발송·인수완료)까지 언제든지
//
// 주의: '/my', '/sales'는 '/:id'보다 위에 선언해야 합니다.
const express = require('express');
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middlewares/auth');
const { HttpError, asyncHandler, ok, requireText } = require('../utils/http');
const { ORDER_STAGES } = require('../utils/constants');

const router = express.Router();

const PHONE_RE = /^01[016789]-?\d{3,4}-?\d{4}$/;

const SELECT_ORDER = `
  SELECT o.*, m.title, m.brand, m.perfume_id, m.status AS post_status, m.user_id AS seller_id,
         s.nickname AS seller_nickname, b.nickname AS buyer_nickname
    FROM orders o
    JOIN market_posts m ON m.id = o.post_id
    JOIN users s ON s.id = m.user_id
    JOIN users b ON b.id = o.buyer_id`;

// withReceiver가 true일 때만 구매자 개인정보(이름·전화번호·주소)를 포함
const toOrder = (row, withReceiver) => ({
  id: row.id,
  stage: row.stage,
  price: row.price,
  post: {
    id: row.post_id,
    title: row.title,
    brand: row.brand,
    perfumeId: row.perfume_id,
    status: row.post_status,
  },
  seller: { id: row.seller_id, nickname: row.seller_nickname },
  buyer: { id: row.buyer_id, nickname: row.buyer_nickname },
  receiver: withReceiver ? { name: row.receiver_name, phone: row.receiver_phone, address: row.address } : null,
  shippedAt: row.shipped_at,
  receivedAt: row.received_at,
  deliveredAt: row.delivered_at,
  createdAt: row.created_at,
});

async function findOrder(id) {
  const [rows] = await pool.query(`${SELECT_ORDER} WHERE o.id = ?`, [id]);
  if (rows.length === 0) throw new HttpError(404, '거래를 찾을 수 없습니다.');
  return rows[0];
}

// 구매 신청 본문 검사
function checkReceiver(body) {
  const name = requireText(body.name, '받는 사람 이름(name)', 30);
  const phone = requireText(body.phone, '전화번호(phone)', 20);
  if (!PHONE_RE.test(phone)) throw new HttpError(400, '전화번호는 010-1234-5678 형식으로 입력해 주세요.');
  const address = requireText(body.address, '배송주소(address)', 200);
  if (address.length < 5) throw new HttpError(400, '배송주소를 정확히 입력해 주세요.');
  return { receiver_name: name, receiver_phone: phone, address };
}

/**
 * 거래 단계를 한 단계 이동 (현재 단계가 from일 때만 to로 변경)
 * - 진행: timeColumn에 현재 시각 기록 / 취소(undo = true): timeColumn을 비움
 * - postStatus를 주면 판매글 상태도 함께 변경 → 트랜잭션으로 둘 다 성공하거나 둘 다 취소
 */
async function moveStage(orderId, from, to, timeColumn, postStatus, undo = false) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT id, post_id, stage FROM orders WHERE id = ? FOR UPDATE', [orderId]);
    if (rows.length === 0) throw new HttpError(404, '거래를 찾을 수 없습니다.');
    if (rows[0].stage !== from) {
      throw new HttpError(409, `'${from}' 단계의 거래만 처리할 수 있습니다. (현재: ${rows[0].stage})`);
    }
    await conn.query(`UPDATE orders SET stage = ?, ${timeColumn} = ${undo ? 'NULL' : 'NOW()'} WHERE id = ?`, [to, orderId]);
    if (postStatus) await conn.query('UPDATE market_posts SET status = ? WHERE id = ?', [postStatus, rows[0].post_id]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ★ 구매 신청: POST /api/orders  { postId, name, phone, address }
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const postId = Number(req.body.postId);
    if (!Number.isInteger(postId) || postId < 1) throw new HttpError(400, '구매할 판매글(postId)을 선택해 주세요.');
    const receiver = checkReceiver(req.body);

    const conn = await pool.getConnection();
    let orderId;
    try {
      await conn.beginTransaction();
      // FOR UPDATE: 두 사람이 동시에 구매해도 한 명만 성공하도록 판매글을 잠금
      const [posts] = await conn.query('SELECT id, user_id, price, status FROM market_posts WHERE id = ? FOR UPDATE', [
        postId,
      ]);
      if (posts.length === 0) throw new HttpError(404, '판매글을 찾을 수 없습니다.');
      const post = posts[0];
      if (post.user_id === req.user.id) throw new HttpError(403, '본인이 올린 판매글은 구매할 수 없습니다.');
      if (post.status !== '판매중') throw new HttpError(409, `이미 거래가 진행 중인 판매글입니다. (${post.status})`);

      const [result] = await conn.query('INSERT INTO orders SET ?', [
        { ...receiver, post_id: post.id, buyer_id: req.user.id, price: post.price },
      ]);
      await conn.query("UPDATE market_posts SET status = '예약중' WHERE id = ?", [post.id]);
      await conn.commit();
      orderId = result.insertId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    ok(res, toOrder(await findOrder(orderId), true), 201);
  })
);

// 내 구매 목록: GET /api/orders/my
router.get(
  '/my',
  auth,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(`${SELECT_ORDER} WHERE o.buyer_id = ? ORDER BY o.created_at DESC, o.id DESC`, [
      req.user.id,
    ]);
    ok(res, rows.map((row) => toOrder(row, true)));
  })
);

// 내 판매 거래 목록: GET /api/orders/sales  (구매자 개인정보 제외)
router.get(
  '/sales',
  auth,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(`${SELECT_ORDER} WHERE m.user_id = ? ORDER BY o.created_at DESC, o.id DESC`, [
      req.user.id,
    ]);
    ok(res, rows.map((row) => toOrder(row, false)));
  })
);

// 전체 거래 목록 (관리자): GET /api/orders?stage=
router.get(
  '/',
  auth,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { stage } = req.query;
    const params = [];
    let whereSql = '';
    if (stage) {
      if (!ORDER_STAGES.includes(stage)) throw new HttpError(400, `stage는 ${ORDER_STAGES.join(', ')} 중 하나여야 합니다.`);
      whereSql = 'WHERE o.stage = ?';
      params.push(stage);
    }
    const [rows] = await pool.query(`${SELECT_ORDER} ${whereSql} ORDER BY o.created_at ASC, o.id ASC`, params);
    ok(res, rows.map((row) => toOrder(row, true)));
  })
);

// 거래 상세: GET /api/orders/:id  (구매자·판매자·관리자만, 개인정보는 구매자·관리자만)
router.get(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const row = await findOrder(req.params.id);
    const isAdmin = req.user.role === 'admin';
    const isBuyer = row.buyer_id === req.user.id;
    const isSeller = row.seller_id === req.user.id;
    if (!isAdmin && !isBuyer && !isSeller) throw new HttpError(403, '거래 당사자와 관리자만 볼 수 있습니다.');
    ok(res, toOrder(row, isAdmin || isBuyer));
  })
);

// 판매자 발송: PATCH /api/orders/:id/ship  (판매자가 물품을 관리자에게 보냄)
router.patch(
  '/:id/ship',
  auth,
  asyncHandler(async (req, res) => {
    const row = await findOrder(req.params.id);
    if (row.seller_id !== req.user.id) throw new HttpError(403, '판매자 본인만 발송 처리할 수 있습니다.');
    await moveStage(row.id, '구매신청', '판매자발송', 'shipped_at');
    ok(res, toOrder(await findOrder(row.id), false));
  })
);

// ★ 물품 인수 (관리자): PATCH /api/orders/:id/receive  (물품과 대금을 받았음을 확인)
router.patch(
  '/:id/receive',
  auth,
  adminOnly,
  asyncHandler(async (req, res) => {
    const row = await findOrder(req.params.id);
    await moveStage(row.id, '판매자발송', '인수완료', 'received_at');
    ok(res, toOrder(await findOrder(row.id), true));
  })
);

// ★ 물품 인계 (관리자): PATCH /api/orders/:id/deliver  (구매자에게 발송 → 판매글 판매완료)
router.patch(
  '/:id/deliver',
  auth,
  adminOnly,
  asyncHandler(async (req, res) => {
    const row = await findOrder(req.params.id);
    await moveStage(row.id, '인수완료', '인계완료', 'delivered_at', '판매완료');
    ok(res, toOrder(await findOrder(row.id), true));
  })
);

// 물품 인수 취소 (관리자): DELETE /api/orders/:id/receive  (인수완료 → 판매자발송)
router.delete(
  '/:id/receive',
  auth,
  adminOnly,
  asyncHandler(async (req, res) => {
    const row = await findOrder(req.params.id);
    await moveStage(row.id, '인수완료', '판매자발송', 'received_at', null, true);
    ok(res, toOrder(await findOrder(row.id), true));
  })
);

// 물품 인계 취소 (관리자): DELETE /api/orders/:id/deliver  (인계완료 → 인수완료, 판매글 판매완료 → 예약중)
router.delete(
  '/:id/deliver',
  auth,
  adminOnly,
  asyncHandler(async (req, res) => {
    const row = await findOrder(req.params.id);
    await moveStage(row.id, '인계완료', '인수완료', 'delivered_at', '예약중', true);
    ok(res, toOrder(await findOrder(row.id), true));
  })
);

// 거래 취소: DELETE /api/orders/:id  → 거래 삭제, 판매글 다시 판매중
//   구매자: 판매자가 발송하기 전(구매신청)까지만 / 관리자: 인계하기 전까지
router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const row = await findOrder(req.params.id);
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && row.buyer_id !== req.user.id) throw new HttpError(403, '구매자 본인 또는 관리자만 취소할 수 있습니다.');
    const cancelable = isAdmin ? ['구매신청', '판매자발송', '인수완료'] : ['구매신청'];

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query('SELECT stage FROM orders WHERE id = ? FOR UPDATE', [row.id]);
      if (rows.length === 0) throw new HttpError(404, '거래를 찾을 수 없습니다.');
      if (!cancelable.includes(rows[0].stage)) {
        throw new HttpError(
          409,
          isAdmin
            ? '이미 구매자에게 인계한 거래입니다. 인계 취소를 먼저 해 주세요.'
            : '판매자가 이미 물품을 보내서 취소할 수 없습니다. 관리자에게 문의해 주세요.'
        );
      }
      await conn.query('DELETE FROM orders WHERE id = ?', [row.id]);
      await conn.query("UPDATE market_posts SET status = '판매중' WHERE id = ?", [row.post_id]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    ok(res, { id: row.id, message: '거래가 취소되었습니다. 판매글이 다시 판매중으로 바뀌었습니다.' });
  })
);

module.exports = router;
