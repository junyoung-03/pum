const crypto = require('crypto');
const Sequelize = require('sequelize');

module.exports = class Payment extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        orderId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: true,
        },
        method: {
          type: Sequelize.ENUM('카드', '카카오페이', '네이버페이', '계좌이체'),
          allowNull: false,
          defaultValue: '카드',
        },
        amount: {
          type: Sequelize.INTEGER,
          allowNull: false,
          validate: { min: 0 },
        },
        status: {
          type: Sequelize.ENUM('결제완료', '환불완료'),
          allowNull: false,
          defaultValue: '결제완료',
        },
        merchantUid: {
          type: Sequelize.STRING(40),
          allowNull: false,
          unique: true,
        },
        paidAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        refundedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        timestamps: true,
        underscored: true,
        modelName: 'Payment',
        tableName: 'payments',
        paranoid: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      }
    );
  }

  // 모의 결제 거래번호 생성 (예: PAY-20261128-A1B2C3)
  static generateMerchantUid() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `PAY-${date}-${suffix}`;
  }

  static associate(db) {
    db.Payment.belongsTo(db.Order, {
      foreignKey: 'orderId',
      targetKey: 'id',
      as: 'order',
      onDelete: 'CASCADE',
      onUpdate: 'NO ACTION',
    });
  }
};
