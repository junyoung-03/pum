const Sequelize = require('sequelize');

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
        volumeMl: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        remainPercent: {
          type: Sequelize.TINYINT,
          allowNull: false,
        },
        price: {
          type: Sequelize.INTEGER,
          allowNull: false,
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

  static associate(db) {
    db.MarketPost.belongsTo(db.User, { foreignKey: 'userId', as: 'seller', targetKey: 'id' });
    db.MarketPost.belongsTo(db.Perfume, { foreignKey: 'perfumeId', as: 'perfume', targetKey: 'id' });
    db.MarketPost.hasOne(db.Order, { foreignKey: 'postId', as: 'order', sourceKey: 'id' });
  }
};
