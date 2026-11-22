const Sequelize = require('sequelize');

module.exports = class RecommendHistory extends Sequelize.Model {
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
          allowNull: true,
        },
        mood: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: '',
        },
        season: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: '',
        },
        category: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: '',
        },
        purpose: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: '',
        },
        perfumeId: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        score: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        matchedCriteria: {
          type: Sequelize.JSON,
          allowNull: false,
        },
        reason: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
      },
      {
        sequelize,
        timestamps: true,
        updatedAt: false,
        underscored: true,
        modelName: 'RecommendHistory',
        tableName: 'recommend_history',
        paranoid: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      }
    );
  }

  static associate(db) {
    db.RecommendHistory.belongsTo(db.User, { foreignKey: 'userId', as: 'user', targetKey: 'id' });
    db.RecommendHistory.belongsTo(db.Perfume, { foreignKey: 'perfumeId', as: 'perfume', targetKey: 'id' });
  }
};
