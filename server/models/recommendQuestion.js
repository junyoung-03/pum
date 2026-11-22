const Sequelize = require('sequelize');

module.exports = class RecommendQuestion extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
        },
        qKey: {
          type: Sequelize.STRING(20),
          allowNull: false,
          unique: true,
        },
        title: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        subtitle: {
          type: Sequelize.STRING(100),
          allowNull: false,
          defaultValue: '',
        },
        options: {
          type: Sequelize.JSON,
          allowNull: false,
        },
        sortOrder: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        timestamps: false,
        underscored: true,
        modelName: 'RecommendQuestion',
        tableName: 'recommend_questions',
        paranoid: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      }
    );
  }

  static associate() {}
};
