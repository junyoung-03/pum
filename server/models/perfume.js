const Sequelize = require('sequelize');
const { HttpError } = require('../utils/http');

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

  static async findDetail(id) {
    const perfume = await this.findByPk(id);
    if (!perfume) throw new HttpError(404, '향수를 찾을 수 없습니다.');
    return perfume;
  }

  static listPage({ q, category, mood, season, limit, offset }) {
    const { Op } = Sequelize;
    const conditions = [];
    if (q) conditions.push({ [Op.or]: [{ name: { [Op.like]: `%${q}%` } }, { brand: { [Op.like]: `%${q}%` } }] });
    if (category) conditions.push({ category });
    for (const [field, value] of Object.entries({ mood, season })) {
      if (value) conditions.push(Sequelize.where(Sequelize.fn('JSON_CONTAINS', Sequelize.col(field), JSON.stringify(value)), 1));
    }
    return this.findAndCountAll({ where: conditions.length ? { [Op.and]: conditions } : {},
      order: [['sortOrder', 'ASC'], ['id', 'ASC']], limit, offset });
  }

  static listFeatured() {
    return this.findAll({ attributes: ['id', 'brand', 'name', 'shortCopy', 'image', 'color', 'featuredOrder'],
      where: { isFeatured: true }, order: [['featuredOrder', 'ASC']], limit: 3 });
  }

  static similarityScore(base, other) {
    // mood·season은 JSON NOT NULL 컬럼이라 항상 배열
    let score = 0;
    if (other.category === base.category) score += 3;
    score += other.mood.filter((m) => base.mood.includes(m)).length;
    score += other.season.filter((s) => base.season.includes(s)).length * 0.5;
    return score;
  }

  static async findSimilar(id, limit) {
    const base = await this.findDetail(id);
    const others = await this.findAll({
      attributes: ['id', 'brand', 'name', 'image', 'category', 'mood', 'season'],
      where: { id: { [Sequelize.Op.ne]: base.id } },
    });
    others.forEach((perfume) => perfume.setDataValue('similarity', this.similarityScore(base, perfume)));
    const result = others
      .sort((a, b) => b.get('similarity') - a.get('similarity') || a.id.localeCompare(b.id))
      .slice(0, limit);
    return { result, base: { id: base.id, brand: base.brand, name: base.name } };
  }

  static async createPerfume(id, values) {
    if (await this.findByPk(id, { attributes: ['id'] })) throw new HttpError(409, '이미 존재하는 향수 id입니다.');
    const maxOrder = await this.max('sortOrder');
    return this.create({ id, ...values, sortOrder: (maxOrder || 0) + 1 });
  }

  static async changePerfume(id, values) {
    const perfume = await this.findDetail(id);
    await perfume.update(values);
    return perfume;
  }

  static async removePerfume(id) {
    const perfume = await this.findDetail(id);
    await perfume.destroy();
  }

  static associate(db) {
    // onDelete·onUpdate는 db/schema.sql의 외래키 규칙과 같게 유지
    db.Perfume.hasMany(db.Review, { foreignKey: 'perfumeId', sourceKey: 'id', as: 'reviews', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    db.Perfume.hasMany(db.Favorite, { foreignKey: 'perfumeId', sourceKey: 'id', as: 'favorites', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    db.Perfume.hasMany(db.MarketPost, { foreignKey: 'perfumeId', sourceKey: 'id', as: 'marketPosts', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
    db.Perfume.hasMany(db.RecommendHistory, { foreignKey: 'perfumeId', sourceKey: 'id', as: 'recommendHistories', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  }
};
