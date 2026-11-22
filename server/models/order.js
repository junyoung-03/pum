const Sequelize = require('sequelize');
const { HttpError } = require('../utils/http');

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
    const { MarketPost, User } = this.sequelize.models;
    return [
      { model: MarketPost, as: 'post', attributes: ['id', 'title', 'brand', 'perfumeId', 'status', 'userId'],
        ...(sellerId === undefined ? {} : { where: { userId: sellerId } }),
        include: [{ model: User, as: 'seller', attributes: ['id', 'nickname'] }] },
      { model: User, as: 'buyer', attributes: ['id', 'nickname'] },
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
    return this.findAll({ include: this.includes(sellerId), order: [['createdAt', 'DESC'], ['id', 'DESC']] });
  }

  static listAll(stage) {
    return this.findAll({ where: stage ? { stage } : {}, include: this.includes(), order: [['createdAt', 'ASC'], ['id', 'ASC']] });
  }

  // Keep ORM association objects; only adapt the legacy API's receiver/seller fields.
  toResponse(withReceiver) {
    const data = this.toJSON();
    data.seller = data.post ? data.post.seller : null;
    if (data.post) {
      delete data.post.seller;
      delete data.post.userId;
    }
    data.receiver = withReceiver ? { name: data.receiverName, phone: data.receiverPhone, address: data.address } : null;
    for (const field of ['postId', 'buyerId', 'receiverName', 'receiverPhone', 'address', 'updatedAt']) delete data[field];
    return data;
  }

  static async purchase(postId, buyerId, receiver) {
    const { MarketPost } = this.sequelize.models;
    const orderId = await this.sequelize.transaction(async (t) => {
      const post = await MarketPost.findByPk(postId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!post) throw new HttpError(404, '판매글을 찾을 수 없습니다.');
      if (post.userId === buyerId) throw new HttpError(403, '본인이 올린 판매글은 구매할 수 없습니다.');
      if (post.status !== '판매중') throw new HttpError(409, `이미 거래가 진행 중인 판매글입니다. (${post.status})`);
      const order = await this.create({ ...receiver, postId: post.id, buyerId, price: post.price }, { transaction: t });
      await post.update({ status: '예약중' }, { transaction: t });
      return order.id;
    });
    return this.findDetail(orderId);
  }

  static async cancel(orderId, user) {
    const isAdmin = user.role === 'admin';
    const cancelable = isAdmin ? ['구매신청', '판매자발송', '인수완료'] : ['구매신청'];
    await this.sequelize.transaction(async (t) => {
      const order = await this.findByPk(orderId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!order) throw new HttpError(404, '거래를 찾을 수 없습니다.');
      if (!isAdmin && order.buyerId !== user.id) throw new HttpError(403, '구매자 본인 또는 관리자만 취소할 수 있습니다.');
      if (!cancelable.includes(order.stage)) throw new HttpError(409, isAdmin
        ? '이미 구매자에게 인계한 거래입니다. 인계 취소를 먼저 해 주세요.'
        : '판매자가 이미 물품을 보내서 취소할 수 없습니다. 관리자에게 문의해 주세요.');
      await order.destroy({ transaction: t });
      await this.sequelize.models.MarketPost.update({ status: '판매중' }, { where: { id: order.postId }, transaction: t });
    });
  }

  static async moveStage(orderId, from, to, timeField, postStatus, undo = false) {
    await this.sequelize.transaction(async (t) => {
      const order = await this.findByPk(orderId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!order) throw new HttpError(404, '거래를 찾을 수 없습니다.');
      if (order.stage !== from) {
        throw new HttpError(409, `'${from}' 단계의 거래만 처리할 수 있습니다. (현재: ${order.stage})`);
      }
      await order.update({ stage: to, [timeField]: undo ? null : new Date() }, { transaction: t });
      if (postStatus) {
        await this.sequelize.models.MarketPost.update({ status: postStatus }, { where: { id: order.postId }, transaction: t });
      }
    });
  }

  static associate(db) {
    db.Order.belongsTo(db.MarketPost, { foreignKey: 'postId', as: 'post', targetKey: 'id' });
    db.Order.belongsTo(db.User, { foreignKey: 'buyerId', as: 'buyer', targetKey: 'id' });
  }
};
