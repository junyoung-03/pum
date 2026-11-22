const Sequelize = require('sequelize');
const { HttpError } = require('../utils/http');


module.exports = class Review extends Sequelize.Model {
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
          allowNull: false,
        },
        rating: {
          type: Sequelize.TINYINT,
          allowNull: false,
        },
        content: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        authorName: {
          type: Sequelize.VIRTUAL,
          get() {
            return this.user ? this.user.nickname : undefined;
          },
        },
        perfumeName: {
          type: Sequelize.VIRTUAL,
          get() {
            return this.perfume ? `${this.perfume.brand} ${this.perfume.name}` : undefined;
          },
        },
      },
      {
        sequelize,
        timestamps: true,
        underscored: true,
        modelName: 'Review',
        tableName: 'reviews',
        paranoid: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      }
    );
  }

  static includes() {
    const { User, Perfume } = this.sequelize.models;
    return [
      { model: User, as: 'user', attributes: ['id', 'nickname'] },
      { model: Perfume, as: 'perfume', attributes: ['brand', 'name'] },
    ];
  }

  static async findDetail(id) {
    const review = await this.findByPk(id, { include: this.includes() });
    if (!review) throw new HttpError(404, '리뷰를 찾을 수 없습니다.');
    return review;
  }

  static listPage({ perfumeId, sort, limit, offset }) {
    const orders = {
      latest: [['createdAt', 'DESC'], ['id', 'DESC']],
      rating: [['rating', 'DESC'], ['createdAt', 'DESC'], ['id', 'DESC']],
    };
    return this.findAndCountAll({ where: perfumeId ? { perfumeId } : {}, order: orders[sort],
      limit, offset, include: this.includes(), distinct: true });
  }

  static async statistics(perfumeId) {
    await this.sequelize.models.Perfume.findDetail(perfumeId);
    const rows = await this.findAll({
      attributes: ['rating', [Sequelize.fn('COUNT', Sequelize.col('id')), 'cnt']],
      where: { perfumeId }, group: ['rating'], raw: true,
    });
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let count = 0;
    let sum = 0;
    for (const row of rows) {
      distribution[row.rating] = Number(row.cnt);
      count += Number(row.cnt);
      sum += row.rating * Number(row.cnt);
    }
    return { perfumeId, reviewCount: count, averageRating: count ? Math.round(sum / count * 10) / 10 : 0, distribution };
  }

  static async createReview(values) {
    await this.sequelize.models.Perfume.findDetail(values.perfumeId);
    const existing = await this.findOne({ where: { userId: values.userId, perfumeId: values.perfumeId }, attributes: ['id'] });
    if (existing) throw new HttpError(409, '이미 이 향수에 작성한 리뷰가 있습니다. 기존 리뷰를 수정해 주세요.');
    try {
      const review = await this.create(values);
      return this.findDetail(review.id);
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError' || err.code === 'ER_DUP_ENTRY') throw new HttpError(409, '이미 이 향수에 작성한 리뷰가 있습니다.');
      throw err;
    }
  }

  static async findOwn(id, userId) {
    const review = await this.findDetail(id);
    if (review.userId !== userId) throw new HttpError(403, '본인이 작성한 리뷰만 수정·삭제할 수 있습니다.');
    return review;
  }

  static async changeOwn(id, userId, values) {
    const review = await this.findOwn(id, userId);
    await review.update(values);
    return this.findDetail(id);
  }

  static async removeOwn(id, userId) {
    const review = await this.findOwn(id, userId);
    await review.destroy();
  }

  static associate(db) {
    db.Review.belongsTo(db.User, { foreignKey: 'userId', as: 'user', targetKey: 'id' });
    db.Review.belongsTo(db.Perfume, { foreignKey: 'perfumeId', as: 'perfume', targetKey: 'id' });
  }
};
