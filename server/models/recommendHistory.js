const Sequelize = require('sequelize');
const { Op } = Sequelize;
const { HttpError } = require('../utils/http');

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

  // 추천 이유 문장 (프론트 ResultPage.tsx의 generateReason과 같은 문장)
  static generateReason(answers, perfume) {
    const parts = [];
    if (answers.mood) parts.push(`"${answers.mood}" 분위기`);
    if (answers.season) parts.push(`${answers.season} 계절감`);
    if (answers.category) parts.push(`${answers.category} 계열 선호도`);
    if (answers.purpose) parts.push(`${answers.purpose} 목적`);

    const criteriaText = parts.length > 0 ? `선택하신 ${parts.join(', ')}를 기준으로 분석했습니다.` : '';
    const brandText = `${perfume.brand}의 ${perfume.name}은(는)`;
    const moodDesc = perfume.moodTags.slice(0, 2).join(', ');
    const purposeDesc = perfume.purpose.join(' 또는 ');
    return `${criteriaText} ${brandText} ${moodDesc} 무드를 연출하며, ${purposeDesc} 상황에 특히 잘 어울리는 향수입니다.`;
  }

  /**
   * 추천 점수 계산 (프론트 ResultPage.tsx의 calculateRecommendation과 같은 기준)
   *   무드 일치 +30, 계절 일치 +25, 향 계열 일치 +30, 용도 일치 +15
   *   최고 점수가 0이면 첫 번째 향수를 '기본 추천'(50점)으로 반환
   */
  static calculateRecommendation(answers, perfumes) {
    const results = perfumes.map((perfume) => {
      let score = 0;
      const matchedCriteria = [];
      const pMood = perfume.mood;
      const pSeason = perfume.season;
      const pPurpose = perfume.purpose;

      if (answers.mood && pMood.includes(answers.mood)) {
        score += 30;
        matchedCriteria.push(`${answers.mood} 분위기`);
      }
      if (answers.season && pSeason.includes(answers.season)) {
        score += 25;
        matchedCriteria.push(`${answers.season} 계절`);
      }
      if (answers.category && perfume.category === answers.category) {
        score += 30;
        matchedCriteria.push(`${answers.category} 계열`);
      }
      if (answers.purpose && pPurpose.includes(answers.purpose)) {
        score += 15;
        matchedCriteria.push(`${answers.purpose} 용도`);
      }
      return { perfume, score, matchedCriteria };
    });

    results.sort((a, b) => b.score - a.score);
    const best = results[0];

    if (best.score === 0) {
      return {
        perfume: perfumes[0],
        score: 50,
        matchedCriteria: ['기본 추천'],
        reason: this.generateReason(answers, perfumes[0]),
      };
    }
    return { ...best, reason: this.generateReason(answers, best.perfume) };
  }

  // 통계: 전체 추천 수, 항목별 많이 고른 답변, 많이 추천된 향수 [{ perfumeId, count, perfume: {...} }]
  static async statistics() {
    const totalCount = await this.count();

    const topAnswers = {};
    for (const key of ['mood', 'season', 'category', 'purpose']) {
      topAnswers[key] = await this.findAll({
        attributes: [[key, 'value'], [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
        where: { [key]: { [Op.ne]: '' } },
        group: [key],
        order: [[Sequelize.literal('`count`'), 'DESC'], [key, 'ASC']],
        limit: 3,
      });
    }

    const topPerfumes = await this.findAll({
      attributes: ['perfumeId', [Sequelize.fn('COUNT', Sequelize.col('RecommendHistory.id')), 'count']],
      include: [{ ...this.perfumeInclude(), required: true }],
      group: ['RecommendHistory.perfume_id', 'perfume.id', 'perfume.brand', 'perfume.name', 'perfume.image'],
      order: [[Sequelize.literal('`count`'), 'DESC'], [Sequelize.col('perfume.id'), 'ASC']],
      limit: 5,
    });

    return { totalCount, topAnswers, topPerfumes };
  }

  static perfumeInclude() {
    return { model: this.sequelize.models.Perfume, as: 'perfume', attributes: ['id', 'brand', 'name', 'image'] };
  }

  static async recommend(answers, userId) {
    const perfumes = await this.sequelize.models.Perfume.findAll({ order: [['sortOrder', 'ASC'], ['id', 'ASC']] });
    if (!perfumes.length) throw new HttpError(404, '추천할 향수가 없습니다.');
    const result = this.calculateRecommendation(answers, perfumes);
    const saved = await this.create({ ...answers, userId: userId || null, perfumeId: result.perfume.id,
      score: result.score, matchedCriteria: result.matchedCriteria, reason: result.reason });
    return { historyId: userId ? saved.id : null, savedToHistory: Boolean(userId), answers, ...result };
  }

  static listOwn(userId) {
    return this.findAll({ where: { userId }, order: [['createdAt', 'DESC'], ['id', 'DESC']], include: [this.perfumeInclude()] });
  }

  static async findOwn(id, userId) {
    const history = await this.findByPk(id, { include: [this.perfumeInclude()] });
    if (!history) throw new HttpError(404, '추천 기록을 찾을 수 없습니다.');
    if (history.userId !== userId) throw new HttpError(403, '본인의 추천 기록만 볼 수 있습니다.');
    return history;
  }

  static async removeOwn(id, userId) {
    const history = await this.findOwn(id, userId);
    await history.destroy();
  }

  static associate(db) {
    db.RecommendHistory.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'id', as: 'user', onDelete: 'SET NULL', onUpdate: 'NO ACTION' });
    db.RecommendHistory.belongsTo(db.Perfume, { foreignKey: 'perfumeId', targetKey: 'id', as: 'perfume', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  }
};
