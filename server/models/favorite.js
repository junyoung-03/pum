const Sequelize = require('sequelize');

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
      }
    );
  }

  static associate(db) {
    db.Favorite.belongsTo(db.User, { foreignKey: 'userId', as: 'user', targetKey: 'id' });
    db.Favorite.belongsTo(db.Perfume, { foreignKey: 'perfumeId', as: 'perfume', targetKey: 'id' });
  }
};
