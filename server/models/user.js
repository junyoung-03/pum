const Sequelize = require('sequelize');

module.exports = class User extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        email: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true,
        },
        password: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        nickname: {
          type: Sequelize.STRING(30),
          allowNull: false,
          unique: true,
        },
        role: {
          type: Sequelize.ENUM('user', 'admin'),
          allowNull: false,
          defaultValue: 'user',
        },
      },
      {
        sequelize,
        timestamps: true,
        underscored: true,
        modelName: 'User',
        tableName: 'users',
        paranoid: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      }
    );
  }

  static associate(db) {
    db.User.hasMany(db.Review, { foreignKey: 'userId', as: 'reviews', onDelete: 'CASCADE' });
    db.User.hasMany(db.Favorite, { foreignKey: 'userId', as: 'favorites', onDelete: 'CASCADE' });
    db.User.hasMany(db.MarketPost, { foreignKey: 'userId', as: 'marketPosts', onDelete: 'CASCADE' });
    db.User.hasMany(db.Order, { foreignKey: 'buyerId', as: 'boughtOrders', onDelete: 'CASCADE' });
    db.User.hasMany(db.RecommendHistory, { foreignKey: 'userId', as: 'recommendHistories', onDelete: 'SET NULL' });
  }
};
