const Sequelize = require('sequelize');

module.exports = class RevokedToken extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        tokenId: {
          type: Sequelize.STRING(100),
          primaryKey: true,
        },
        expiresAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        timestamps: true,
        updatedAt: false,
        underscored: true,
        modelName: 'RevokedToken',
        tableName: 'revoked_tokens',
        paranoid: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      }
    );
  }

  static associate() {}
};
