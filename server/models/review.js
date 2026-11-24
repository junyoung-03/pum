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
          validate: { min: 1, max: 5 }, // schema.sql의 CHECK (rating BETWEEN 1 AND 5)
        },
        content: {
          type: Sequelize.TEXT,
          allowNull: false,
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
        // 한 회원이 같은 향수에 한 번만 (schema.sql의 uq_review)
        indexes: [{ name: 'uq_review', unique: true, fields: ['user_id', 'perfume_id'] }],
      }
    );
  }

  static includes() {
    const { User, Perfume } = this.sequelize.models;
    return [
      { model: User, as: 'user', attributes: ['id', 'nickname'] },
      { model: Perfume, as: 'perfume', attributes: ['id', 'brand', 'name'] },
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
    try {
      const review = await this.create(values);
      return await this.findDetail(review.id);
    } catch (err) {
      // 중복 작성은 uq_review 제약으로 한 번만 검사
      if (err.name === 'SequelizeUniqueConstraintError') throw new HttpError(409, '이미 이 향수에 작성한 리뷰가 있습니다. 기존 리뷰를 수정해 주세요.');
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
    return review.update(values);
  }

  static async removeOwn(id, userId) {
    const review = await this.findOwn(id, userId);
    await review.destroy();
  }

  static associate(db) {
    db.Review.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'id', as: 'user', onDelete: 'CASCADE', onUpdate: 'NO ACTION' });
    db.Review.belongsTo(db.Perfume, { foreignKey: 'perfumeId', targetKey: 'id', as: 'perfume', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  }
};
