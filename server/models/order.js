const Sequelize = require('sequelize');

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

  static associate(db) {
    db.Order.belongsTo(db.MarketPost, { foreignKey: 'postId', as: 'post', targetKey: 'id' });
    db.Order.belongsTo(db.User, { foreignKey: 'buyerId', as: 'buyer', targetKey: 'id' });
  }
};
