const Sequelize = require('sequelize');

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
        },
        content: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        authorName: {
          type: Sequelize.VIRTUAL,
          get() {
            return this.user ? this.user.nickname : undefined;
          },
        },
        perfumeName: {
          type: Sequelize.VIRTUAL,
          get() {
            return this.perfume ? `${this.perfume.brand} ${this.perfume.name}` : undefined;
          },
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
      }
    );
  }

  static associate(db) {
    db.Review.belongsTo(db.User, { foreignKey: 'userId', as: 'user', targetKey: 'id' });
    db.Review.belongsTo(db.Perfume, { foreignKey: 'perfumeId', as: 'perfume', targetKey: 'id' });
  }
};
