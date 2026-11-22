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
const { Order } = require('../models');
const { auth, adminOnly } = require('../middlewares/auth');
const { HttpError, asyncHandler, ok, requireText } = require('../utils/http');
const { ORDER_STAGES } = require('../utils/constants');

const router = express.Router();

const PHONE_RE = /^01[016789]-?\d{3,4}-?\d{4}$/;

// 구매 신청 본문 검사
function checkReceiver(body) {
  const name = requireText(body.name, '받는 사람 이름(name)', 30);
  const phone = requireText(body.phone, '전화번호(phone)', 20);
  if (!PHONE_RE.test(phone)) throw new HttpError(400, '전화번호는 010-1234-5678 형식으로 입력해 주세요.');
  const address = requireText(body.address, '배송주소(address)', 200);
  if (address.length < 5) throw new HttpError(400, '배송주소를 정확히 입력해 주세요.');
  return { receiverName: name, receiverPhone: phone, address };
}

/**
 * [핵심 API 1] 구매 신청 (중고거래 주문 생성 및 판매글 예약)
 * - Method / Path: POST /api/orders
 * - Request Body: { postId, name, phone, address }
 * - 핵심 로직 & 동시성 제어:
 *   1) Sequelize lock: t.LOCK.UPDATE로 판매글 레코드를 잠가 동시 구매 시 1명만 성공하도록 보장
 *   2) 본인 글 구매 차단(403), 이미 거래 중인 글 차단(409)
 *   3) 트랜잭션으로 주문 생성과 판매글 상태 변경('예약중')을 원자적으로 처리
 */
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const postId = Number(req.body.postId);
    if (!Number.isInteger(postId) || postId < 1) throw new HttpError(400, '구매할 판매글(postId)을 선택해 주세요.');
    const receiver = checkReceiver(req.body);

    const created = await Order.purchase(postId, req.user.id, receiver);
    ok(res, created.toResponse(true), 201);
  })
);

/**
 * [기능 API] 내 구매 목록 조회
 * - Method / Path: GET /api/orders/my
 * - Auth: 로그인 필수
 * - 핵심 로직: 로그인한 회원이 구매 신청한 모든 거래 목록 조회 (본인이므로 배송 정보 receiver 포함)
 */
router.get(
  '/my',
  auth,
  asyncHandler(async (req, res) => {
    const orders = await Order.listPurchases(req.user.id);
    ok(res, orders.map((o) => o.toResponse(true)));
  })
);

/**
 * [기능 API] 내 판매 거래 목록 조회
 * - Method / Path: GET /api/orders/sales
 * - Auth: 로그인 필수
 * - 핵심 로직: 내 판매글에 들어온 거래 목록 조회 (개인정보 보호를 위해 구매자 배송 정보는 receiver: null 마스킹)
 */
router.get(
  '/sales',
  auth,
  asyncHandler(async (req, res) => {
    const orders = await Order.listSales(req.user.id);
    ok(res, orders.map((o) => o.toResponse(false)));
  })
);

/**
 * [관리자 API] 전체 중개 거래 목록 조회
 * - Method / Path: GET /api/orders?stage=
 * - Auth: 관리자 전용 (adminOnly)
 * - Query Params: stage(구매신청/판매자발송/인수완료/인계완료)
 * - 핵심 로직: 관리자가 중개 검수/배송 관리를 위해 전체 회원의 거래 목록을 단계별 필터링 조회
 */
router.get(
  '/',
  auth,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { stage } = req.query;
    if (stage && !ORDER_STAGES.includes(stage)) {
      throw new HttpError(400, `stage는 ${ORDER_STAGES.join(', ')} 중 하나여야 합니다.`);
    }

    const orders = await Order.listAll(stage);
    ok(res, orders.map((o) => o.toResponse(true)));
  })
);

/**
 * [기능 API] 거래 단건 상세 조회
 * - Method / Path: GET /api/orders/:id
 * - Auth: 로그인 필수 (거래 당사자 또는 관리자만)
 * - 핵심 로직: 구매자/관리자에게만 개인정보 노출, 무관한 제3자 접근 시 403 Forbidden 차단
 */
router.get(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const order = await Order.findDetail(req.params.id);
    const isAdmin = req.user.role === 'admin';
    const isBuyer = order.buyerId === req.user.id;
    const isSeller = order.post && order.post.userId === req.user.id;
    if (!isAdmin && !isBuyer && !isSeller) throw new HttpError(403, '거래 당사자와 관리자만 볼 수 있습니다.');
    ok(res, order.toResponse(isAdmin || isBuyer));
  })
);

/**
 * [기능 API] 판매자 발송 처리
 * - Method / Path: PATCH /api/orders/:id/ship
 * - Auth: 판매자 본인만
 * - 핵심 로직: 판매자가 물품을 관리자에게 발송했음을 등록 ('구매신청' ➔ '판매자발송', shippedAt 기록)
 */
router.patch(
  '/:id/ship',
  auth,
  asyncHandler(async (req, res) => {
    const order = await Order.findDetail(req.params.id);
    if (!order.post || order.post.userId !== req.user.id) throw new HttpError(403, '판매자 본인만 발송 처리할 수 있습니다.');
    await Order.moveStage(order.id, '구매신청', '판매자발송', 'shippedAt');
    const updated = await Order.findDetail(order.id);
    ok(res, updated.toResponse(false));
  })
);

/**
 * [핵심 API 2] 물품 및 대금 인수 확인 (관리자 중개 검수)
 * - Method / Path: PATCH /api/orders/:id/receive
 * - 핵심 로직: 관리자(adminOnly)가 판매자로부터 물품을 수령했음을 확인하고 상태를 '판매자발송' ➔ '인수완료'로 전이
 */
router.patch(
  '/:id/receive',
  auth,
  adminOnly,
  asyncHandler(async (req, res) => {
    const order = await Order.findDetail(req.params.id);
    await Order.moveStage(order.id, '판매자발송', '인수완료', 'receivedAt');
    const updated = await Order.findDetail(order.id);
    ok(res, updated.toResponse(true));
  })
);

/**
 * [핵심 API 3] 물품 인계 및 거래 최종 완료 (관리자 중개 배송)
 * - Method / Path: PATCH /api/orders/:id/deliver
 * - 핵심 로직: 관리자가 구매자에게 배송을 완료하고 상태를 '인수완료' ➔ '인계완료', 판매글을 '판매완료'로 최종 확정
 */
router.patch(
  '/:id/deliver',
  auth,
  adminOnly,
  asyncHandler(async (req, res) => {
    const order = await Order.findDetail(req.params.id);
    await Order.moveStage(order.id, '인수완료', '인계완료', 'deliveredAt', '판매완료');
    const updated = await Order.findDetail(order.id);
    ok(res, updated.toResponse(true));
  })
);

/**
 * [관리자 API] 물품 인수 취소 (단계 롤백)
 * - Method / Path: DELETE /api/orders/:id/receive
 * - Auth: 관리자 전용 (adminOnly)
 * - 핵심 로직: 실수 방지를 위해 '인수완료' ➔ '판매자발송'으로 한 단계 되돌림
 */
router.delete(
  '/:id/receive',
  auth,
  adminOnly,
  asyncHandler(async (req, res) => {
    const order = await Order.findDetail(req.params.id);
    await Order.moveStage(order.id, '인수완료', '판매자발송', 'receivedAt', null, true);
    const updated = await Order.findDetail(order.id);
    ok(res, updated.toResponse(true));
  })
);

/**
 * [관리자 API] 물품 인계 취소 (단계 롤백 및 판매글 복원)
 * - Method / Path: DELETE /api/orders/:id/deliver
 * - Auth: 관리자 전용 (adminOnly)
 * - 핵심 로직: '인계완료' ➔ '인수완료'로 되돌리고, 판매글 상태도 '판매완료' ➔ '예약중'으로 원상복구
 */
router.delete(
  '/:id/deliver',
  auth,
  adminOnly,
  asyncHandler(async (req, res) => {
    const order = await Order.findDetail(req.params.id);
    await Order.moveStage(order.id, '인계완료', '인수완료', 'deliveredAt', '예약중', true);
    const updated = await Order.findDetail(order.id);
    ok(res, updated.toResponse(true));
  })
);

/**
 * [핵심 API 4] 거래 취소 및 판매글 복구
 * - Method / Path: DELETE /api/orders/:id
 * - 핵심 로직: 구매자(발송 전까지) 또는 관리자가 거래를 취소하며, 트랜잭션으로 주문을 삭제하고 판매글을 다시 '판매중'으로 원상복구
 */
router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const order = await Order.findDetail(req.params.id);
    await Order.cancel(order.id, req.user);

    ok(res, { id: order.id, message: '거래가 취소되었습니다. 판매글이 다시 판매중으로 바뀌었습니다.' });
  })
);

module.exports = router;
