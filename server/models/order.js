const Sequelize = require('sequelize');
const { HttpError } = require('../utils/http');
const { PAYMENT_METHODS } = require('../utils/constants');

// 구매자 개인정보: 구매자 본인과 관리자에게만 응답
const RECEIVER_FIELDS = ['receiverName', 'receiverPhone', 'address'];

module.exports = class Order extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        postId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: true,
        },
        buyerId: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        price: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        receiverName: {
          type: Sequelize.STRING(30),
          allowNull: false,
        },
        receiverPhone: {
          type: Sequelize.STRING(20),
          allowNull: false,
        },
        address: {
          type: Sequelize.STRING(200),
          allowNull: false,
        },
        stage: {
          type: Sequelize.ENUM('구매신청', '판매자발송', '인수완료', '인계완료'),
          allowNull: false,
          defaultValue: '구매신청',
        },
        shippedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        receivedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        deliveredAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        timestamps: true,
        underscored: true,
        modelName: 'Order',
        tableName: 'orders',
        paranoid: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      }
    );
  }

  static includes(sellerId) {
    const { MarketPost, User, Payment } = this.sequelize.models;
    return [
      { model: MarketPost, as: 'post', attributes: ['id', 'title', 'brand', 'perfumeId', 'status', 'userId'],
        ...(sellerId === undefined ? {} : { where: { userId: sellerId } }),
        include: [{ model: User, as: 'seller', attributes: ['id', 'nickname'] }] },
      { model: User, as: 'buyer', attributes: ['id', 'nickname'] },
      { model: Payment, as: 'payment', attributes: ['id', 'method', 'amount', 'status', 'merchantUid', 'paidAt', 'refundedAt'] },
    ];
  }

  static async findDetail(id) {
    const order = await this.findByPk(id, { include: this.includes() });
    if (!order) throw new HttpError(404, '거래를 찾을 수 없습니다.');
    return order;
  }

  static listPurchases(buyerId) {
    return this.findAll({ where: { buyerId }, include: this.includes(), order: [['createdAt', 'DESC'], ['id', 'DESC']] });
  }

  static listSales(sellerId) {
    return this.findAll({ attributes: { exclude: RECEIVER_FIELDS }, include: this.includes(sellerId), order: [['createdAt', 'DESC'], ['id', 'DESC']] });
  }

  static listAll(stage) {
    return this.findAll({ where: stage ? { stage } : {}, include: this.includes(), order: [['createdAt', 'ASC'], ['id', 'ASC']] });
  }

  // 판매자 응답에서 구매자 개인정보를 제외 (값이 undefined인 필드는 JSON 응답에 포함되지 않음)
  hideReceiver() {
    RECEIVER_FIELDS.forEach((field) => this.setDataValue(field, undefined));
    return this;
  }

  // 구매 신청: 주문 생성 + 모의 결제 생성 + 판매글 '예약중'을 하나의 트랜잭션으로 처리
  static async purchase(postId, buyerId, receiver, paymentInfo = {}) {
    const method = paymentInfo.method || '카드';
    if (!PAYMENT_METHODS.includes(method)) {
      throw new HttpError(400, `결제 수단은 ${PAYMENT_METHODS.join(', ')} 중 하나여야 합니다.`);
    }
    const { MarketPost, Payment } = this.sequelize.models;
    const orderId = await this.sequelize.transaction(async (t) => {
      const post = await MarketPost.findByPk(postId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!post) throw new HttpError(404, '판매글을 찾을 수 없습니다.');
      if (post.userId === buyerId) throw new HttpError(403, '본인이 올린 판매글은 구매할 수 없습니다.');
      if (post.status !== '판매중') throw new HttpError(409, `이미 거래가 진행 중인 판매글입니다. (${post.status})`);
      if (paymentInfo.amount !== undefined && Number(paymentInfo.amount) !== post.price) {
        throw new HttpError(400, '결제 금액이 판매 가격과 일치하지 않습니다.');
      }
      const order = await this.create({ ...receiver, postId: post.id, buyerId, price: post.price }, { transaction: t });
      await Payment.create(
        {
          orderId: order.id,
          method,
          amount: post.price,
          status: '결제완료',
          merchantUid: Payment.generateMerchantUid(),
          paidAt: new Date(),
        },
        { transaction: t }
      );
      await post.update({ status: '예약중' }, { transaction: t });
      return order.id;
    });
    return this.findDetail(orderId);
  }

  // 거래 취소: 주문 삭제 + 판매글 '판매중'
  static async cancel(orderId, user) {
    const isAdmin = user.role === 'admin';
    const cancelable = isAdmin ? ['구매신청', '판매자발송', '인수완료'] : ['구매신청'];
    await this.sequelize.transaction(async (t) => {
      const order = await this.findLocked(orderId, t);
      if (!isAdmin && order.buyerId !== user.id) throw new HttpError(403, '구매자 본인 또는 관리자만 취소할 수 있습니다.');
      if (!cancelable.includes(order.stage)) throw new HttpError(409, isAdmin
        ? '이미 구매자에게 인계한 거래입니다. 인계 취소를 먼저 해 주세요.'
        : '판매자가 이미 물품을 보내서 취소할 수 없습니다. 관리자에게 문의해 주세요.');
      const post = await order.getPost({ transaction: t });
      await order.destroy({ transaction: t });
      await post.update({ status: '판매중' }, { transaction: t });
    });
  }

  // 판매자 발송 (판매자 본인만)
  static ship(orderId, sellerId) {
    return this.moveStage(orderId, '구매신청', { stage: '판매자발송', shippedAt: new Date() }, { sellerId });
  }

  // 물품 인수 / 인수 취소
  static receive(orderId) {
    return this.moveStage(orderId, '판매자발송', { stage: '인수완료', receivedAt: new Date() });
  }

  static undoReceive(orderId) {
    return this.moveStage(orderId, '인수완료', { stage: '판매자발송', receivedAt: null });
  }

  // 물품 인계 / 인계 취소 (판매글 상태도 함께 변경)
  static deliver(orderId) {
    return this.moveStage(orderId, '인수완료', { stage: '인계완료', deliveredAt: new Date() }, { postStatus: '판매완료' });
  }

  static undoDeliver(orderId) {
    return this.moveStage(orderId, '인계완료', { stage: '인수완료', deliveredAt: null }, { postStatus: '예약중' });
  }

  // 거래 단계 변경: 현재 단계가 from일 때만 values로 수정하고, 필요하면 판매글 상태도 같은 트랜잭션에서 변경
  static async moveStage(orderId, from, values, { sellerId, postStatus } = {}) {
    await this.sequelize.transaction(async (t) => {
      const order = await this.findLocked(orderId, t);
      const post = await order.getPost({ transaction: t });
      if (sellerId !== undefined && post.userId !== sellerId) throw new HttpError(403, '판매자 본인만 발송 처리할 수 있습니다.');
      if (order.stage !== from) throw new HttpError(409, `'${from}' 단계의 거래만 처리할 수 있습니다. (현재: ${order.stage})`);
      await order.update(values, { transaction: t });
      if (postStatus) await post.update({ status: postStatus }, { transaction: t });
    });
    return this.findDetail(orderId);
  }

  // 두 요청이 동시에 처리하지 못하도록 주문 행을 잠그고 조회
  static async findLocked(orderId, t) {
    const order = await this.findByPk(orderId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!order) throw new HttpError(404, '거래를 찾을 수 없습니다.');
    return order;
  }

  static associate(db) {
    db.Order.belongsTo(db.MarketPost, { foreignKey: 'postId', targetKey: 'id', as: 'post', onDelete: 'CASCADE', onUpdate: 'NO ACTION' });
    db.Order.belongsTo(db.User, { foreignKey: 'buyerId', targetKey: 'id', as: 'buyer', onDelete: 'CASCADE', onUpdate: 'NO ACTION' });
    db.Order.hasOne(db.Payment, { foreignKey: 'orderId', sourceKey: 'id', as: 'payment', onDelete: 'CASCADE', onUpdate: 'NO ACTION' });
  }
};
