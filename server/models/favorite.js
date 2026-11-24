const Sequelize = require('sequelize');
const { HttpError } = require('../utils/http');

module.exports = class Favorite extends Sequelize.Model {
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
      },
      {
        sequelize,
        timestamps: true,
        updatedAt: false,
        underscored: true,
        modelName: 'Favorite',
        tableName: 'favorites',
        paranoid: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        // 한 회원이 같은 향수에 한 번만 (schema.sql의 uq_favorite)
        indexes: [{ name: 'uq_favorite', unique: true, fields: ['user_id', 'perfume_id'] }],
      }
    );
  }

  // 찜 많은 순: [{ perfumeId, favoriteCount, perfume: {...} }]
  static ranking(limit) {
    return this.findAll({
      attributes: ['perfumeId', [Sequelize.fn('COUNT', Sequelize.col('Favorite.id')), 'favoriteCount']],
      include: [
        { model: this.sequelize.models.Perfume, as: 'perfume', attributes: ['id', 'brand', 'name', 'image'] },
      ],
      group: ['Favorite.perfume_id', 'perfume.id', 'perfume.brand', 'perfume.name', 'perfume.image'],
      order: [[Sequelize.literal('favoriteCount'), 'DESC'], [Sequelize.col('perfume.id'), 'ASC']],
      limit,
    });
  }

  // 내 찜 목록: [{ id, perfumeId, createdAt, perfume: {...} }]
  static listOwn(userId) {
    return this.findAll({
      where: { userId },
      include: [{ model: this.sequelize.models.Perfume, as: 'perfume' }],
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
    });
  }

  static async check(userId, perfumeId) {
    await this.sequelize.models.Perfume.findDetail(perfumeId);
    return Boolean(await this.findOne({ where: { userId, perfumeId }, attributes: ['id'] }));
  }

  static async add(userId, perfumeId) {
    await this.sequelize.models.Perfume.findDetail(perfumeId);
    try {
      await this.create({ userId, perfumeId });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') throw new HttpError(409, '이미 찜한 향수입니다.');
      throw err;
    }
  }

  static async remove(userId, perfumeId) {
    const deleted = await this.destroy({ where: { userId, perfumeId } });
    if (!deleted) throw new HttpError(404, '찜한 향수가 아닙니다.');
  }

  static clearOwn(userId) {
    return this.destroy({ where: { userId } });
  }

  static associate(db) {
    db.Favorite.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'id', as: 'user', onDelete: 'CASCADE', onUpdate: 'NO ACTION' });
    db.Favorite.belongsTo(db.Perfume, { foreignKey: 'perfumeId', targetKey: 'id', as: 'perfume', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  }
};
