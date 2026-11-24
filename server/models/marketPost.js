const Sequelize = require('sequelize');
const { HttpError } = require('../utils/http');

module.exports = class MarketPost extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        perfumeId: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        title: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        brand: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        category: {
          type: Sequelize.ENUM('Floral', 'Woody', 'Musk', 'Citrus', 'Amber'),
          allowNull: true,
        },
        // validate는 schema.sql의 CHECK 제약과 같은 범위
        volumeMl: {
          type: Sequelize.INTEGER,
          allowNull: false,
          validate: { min: 1 },
        },
        remainPercent: {
          type: Sequelize.TINYINT,
          allowNull: false,
          validate: { min: 1, max: 100 },
        },
        price: {
          type: Sequelize.INTEGER,
          allowNull: false,
          validate: { min: 0 },
        },
        content: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM('판매중', '예약중', '판매완료'),
          allowNull: false,
          defaultValue: '판매중',
        },
      },
      {
        sequelize,
        timestamps: true,
        underscored: true,
        modelName: 'MarketPost',
        tableName: 'market_posts',
        paranoid: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      }
    );
  }

  static includes() {
    const { User, Order } = this.sequelize.models;
    return [
      { model: User, as: 'seller', attributes: ['id', 'nickname'] },
      { model: Order, as: 'order', attributes: ['id', 'stage', 'buyerId'] },
    ];
  }

  static async findDetail(id) {
    const post = await this.findByPk(id, { include: this.includes() });
    if (!post) throw new HttpError(404, '판매글을 찾을 수 없습니다.');
    return post;
  }

  // 본인 글이고 구매 신청이 없는 글만 수정·상태 변경·삭제 가능
  static async findEditable(id, userId) {
    const post = await this.findDetail(id);
    if (post.userId !== userId) throw new HttpError(403, '본인이 작성한 판매글만 수정·삭제할 수 있습니다.');
    if (post.order) throw new HttpError(409, '구매 신청이 들어온 판매글은 수정·삭제하거나 상태를 직접 바꿀 수 없습니다. (거래 단계에 따라 자동 변경)');
    return post;
  }

  static async changeOwn(id, userId, values) {
    const post = await this.findEditable(id, userId);
    return post.update(await this.resolvePerfume(values));
  }

  static async removeOwn(id, userId) {
    const post = await this.findEditable(id, userId);
    await post.destroy();
  }

  static listPage({ brand, category, status, sort, minPrice, maxPrice, limit, offset }) {
    const { Op } = Sequelize;
    const where = {};
    if (brand) where.brand = brand;
    if (category) where.category = category;
    if (status) where.status = status;
    if (minPrice !== null && maxPrice !== null) where.price = { [Op.between]: [minPrice, maxPrice] };
    else if (minPrice !== null) where.price = { [Op.gte]: minPrice };
    else if (maxPrice !== null) where.price = { [Op.lte]: maxPrice };
    const orders = {
      latest: [['createdAt', 'DESC'], ['id', 'DESC']],
      priceAsc: [['price', 'ASC'], ['id', 'DESC']],
      priceDesc: [['price', 'DESC'], ['id', 'DESC']],
    };
    return this.findAndCountAll({ where, order: orders[sort], limit, offset, include: this.includes(), distinct: true });
  }

  static listOwn(userId) {
    return this.findAll({ where: { userId }, order: [['createdAt', 'DESC'], ['id', 'DESC']], include: this.includes() });
  }

  static async createPost(values) {
    const post = await this.create(await this.resolvePerfume(values));
    return this.findDetail(post.id);
  }

  static async resolvePerfume(values) {
    const result = { ...values };
    if (values.perfumeId) {
      const perfume = await this.sequelize.models.Perfume.findDetail(values.perfumeId);
      if (values.brand === undefined) result.brand = perfume.brand;
      if (values.category === undefined) result.category = perfume.category;
    }
    return result;
  }

  static associate(db) {
    db.MarketPost.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'id', as: 'seller', onDelete: 'CASCADE', onUpdate: 'NO ACTION' });
    db.MarketPost.belongsTo(db.Perfume, { foreignKey: 'perfumeId', targetKey: 'id', as: 'perfume', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
    db.MarketPost.hasOne(db.Order, { foreignKey: 'postId', sourceKey: 'id', as: 'order', onDelete: 'CASCADE', onUpdate: 'NO ACTION' });
  }
};
