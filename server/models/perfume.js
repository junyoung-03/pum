const Sequelize = require('sequelize');

module.exports = class Perfume extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        id: {
          type: Sequelize.STRING(50),
          primaryKey: true,
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        brand: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        category: {
          type: Sequelize.ENUM('Floral', 'Woody', 'Musk', 'Citrus', 'Amber'),
          allowNull: false,
        },
        noteFamily: {
          type: Sequelize.STRING(100),
          allowNull: false,
          defaultValue: '',
        },
        mood: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: [],
        },
        moodTags: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: [],
        },
        season: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: [],
        },
        purpose: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: [],
        },
        priceLevel: {
          type: Sequelize.ENUM('Premium', 'Luxury', 'Niche'),
          allowNull: false,
          defaultValue: 'Premium',
        },
        price: {
          type: Sequelize.VIRTUAL,
          get() {
            return this.getDataValue('priceLevel');
          },
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        highlight: {
          type: Sequelize.STRING(255),
          allowNull: false,
          defaultValue: '',
        },
        topNote: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: [],
        },
        middleNote: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: [],
        },
        baseNote: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: [],
        },
        image: {
          type: Sequelize.STRING(255),
          allowNull: false,
          defaultValue: '',
        },
        color: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: '#FFFFFF',
        },
        shortCopy: {
          type: Sequelize.STRING(255),
          allowNull: false,
          defaultValue: '',
        },
        isFeatured: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        featured: {
          type: Sequelize.VIRTUAL,
          get() {
            return Boolean(this.getDataValue('isFeatured'));
          },
        },
        featuredOrder: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        sortOrder: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        timestamps: true,
        underscored: true,
        modelName: 'Perfume',
        tableName: 'perfumes',
        paranoid: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      }
    );
  }

  static associate(db) {
    db.Perfume.hasMany(db.Review, { foreignKey: 'perfumeId', as: 'reviews', onDelete: 'CASCADE' });
    db.Perfume.hasMany(db.Favorite, { foreignKey: 'perfumeId', as: 'favorites', onDelete: 'CASCADE' });
    db.Perfume.hasMany(db.MarketPost, { foreignKey: 'perfumeId', as: 'marketPosts', onDelete: 'SET NULL' });
    db.Perfume.hasMany(db.RecommendHistory, { foreignKey: 'perfumeId', as: 'recommendHistories', onDelete: 'SET NULL' });
  }
};
