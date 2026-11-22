// 4. 추천 라우터 /api/recommend  (6개)
// GET    /questions        설문 질문과 보기 목록
// GET    /stats            많이 고른 답변, 많이 추천된 향수
// POST   /               ★ 답변 → 추천 결과 (로그인 선택, 로그인 시 내 기록에 저장)
// GET    /history          내 추천 기록 목록 (로그인)
// GET    /history/:id      기록 상세 (로그인, 본인만)
// DELETE /history/:id      기록 삭제 (로그인, 본인만)
const express = require('express');
const { Op, Sequelize } = require('sequelize');
const { RecommendQuestion, RecommendHistory, Perfume } = require('../models');
const { auth, optionalAuth } = require('../middlewares/auth');
const { HttpError, asyncHandler, ok } = require('../utils/http');
const { CATEGORIES, MOODS, SEASONS, PURPOSES } = require('../utils/constants');

const router = express.Router();

const ANSWER_RULES = {
  mood: MOODS,
  season: SEASONS,
  category: CATEGORIES,
  purpose: PURPOSES,
};

// 추천 이유 문장 (프론트 ResultPage.tsx의 generateReason과 같은 문장)
function generateReason(answers, perfume) {
  const parts = [];
  if (answers.mood) parts.push(`"${answers.mood}" 분위기`);
  if (answers.season) parts.push(`${answers.season} 계절감`);
  if (answers.category) parts.push(`${answers.category} 계열 선호도`);
  if (answers.purpose) parts.push(`${answers.purpose} 목적`);

  const criteriaText = parts.length > 0 ? `선택하신 ${parts.join(', ')}를 기준으로 분석했습니다.` : '';
  const brandText = `${perfume.brand}의 ${perfume.name}은(는)`;
  const moodDesc = (perfume.moodTags || []).slice(0, 2).join(', ');
  const purposeDesc = (perfume.purpose || []).join(' 또는 ');
  return `${criteriaText} ${brandText} ${moodDesc} 무드를 연출하며, ${purposeDesc} 상황에 특히 잘 어울리는 향수입니다.`;
}

/**
 * 추천 점수 계산 (프론트 ResultPage.tsx의 calculateRecommendation과 같은 기준)
 *   무드 일치 +30, 계절 일치 +25, 향 계열 일치 +30, 용도 일치 +15
 *   최고 점수가 0이면 첫 번째 향수를 '기본 추천'(50점)으로 반환
 */
function calculateRecommendation(answers, perfumes) {
  const results = perfumes.map((perfume) => {
    let score = 0;
    const matchedCriteria = [];
    const pMood = perfume.mood || [];
    const pSeason = perfume.season || [];
    const pPurpose = perfume.purpose || [];

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
      reason: generateReason(answers, perfumes[0]),
    };
  }
  return { ...best, reason: generateReason(answers, best.perfume) };
}

function formatHistory(row) {
  const r = row.toJSON ? row.toJSON() : row;
  return {
    id: r.id,
    answers: { mood: r.mood, season: r.season, category: r.category, purpose: r.purpose },
    perfume: r.perfume
      ? { id: r.perfume.id, brand: r.perfume.brand, name: r.perfume.name, image: r.perfume.image }
      : null,
    score: r.score,
    matchedCriteria: r.matchedCriteria,
    reason: r.reason,
    createdAt: r.createdAt,
  };
}

/**
 * [핵심 API 1] 추천 설문 질문 및 선택지 조회
 * - Method / Path: GET /api/recommend/questions
 * - 핵심 로직: Sequelize `RecommendQuestion` 모델에서 문항 및 선택지 목록 순서대로 반환
 */
router.get(
  '/questions',
  asyncHandler(async (req, res) => {
    const rows = await RecommendQuestion.findAll({
      order: [['sortOrder', 'ASC']],
    });
    ok(
      res,
      rows.map((r) => ({
        id: r.id,
        key: r.qKey,
        title: r.title,
        subtitle: r.subtitle,
        options: r.options,
      }))
    );
  })
);

// 통계: GET /api/recommend/stats
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const total = await RecommendHistory.count();

    const topAnswers = {};
    for (const key of Object.keys(ANSWER_RULES)) {
      const rows = await RecommendHistory.findAll({
        attributes: [
          [Sequelize.col(key), 'value'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'cnt'],
        ],
        where: {
          [key]: { [Op.ne]: '' },
        },
        group: [key],
        order: [[Sequelize.literal('cnt'), 'DESC'], [key, 'ASC']],
        limit: 3,
        raw: true,
      });
      topAnswers[key] = rows.map((r) => ({ value: r.value, count: Number(r.cnt) }));
    }

    const perfumeRows = await RecommendHistory.findAll({
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('RecommendHistory.id')), 'cnt'],
      ],
      include: [
        {
          model: Perfume,
          as: 'perfume',
          attributes: ['id', 'brand', 'name', 'image'],
          required: true,
        },
      ],
      group: ['RecommendHistory.perfume_id', 'perfume.id', 'perfume.brand', 'perfume.name', 'perfume.image'],
      order: [[Sequelize.literal('cnt'), 'DESC'], [Sequelize.col('perfume.id'), 'ASC']],
      limit: 5,
      raw: true,
      nest: true,
    });

    ok(res, {
      totalCount: Number(total),
      topAnswers,
      topPerfumes: perfumeRows.map((r) => ({
        id: r.perfume.id,
        brand: r.perfume.brand,
        name: r.perfume.name,
        image: r.perfume.image,
        count: Number(r.cnt),
      })),
    });
  })
);

/**
 * [핵심 API 2] 개인 맞춤 향수 추천 및 가중치 점수 계산 알고리즘
 * - Method / Path: POST /api/recommend
 * - Request Body: { mood, season, category, purpose }
 * - 핵심 로직:
 *   1) 사용자의 설문 답변과 전체 향수의 속성을 대조하여 100점 만점 가중치 점수 산출
 *   2) 최고 득점 향수 및 매칭 사유(reason)를 생성하여 클라이언트에 응답
 *   3) 로그인 회원의 경우 `recommend_history` 테이블에 추천 결과를 Sequelize create로 영속 저장
 */
router.post(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const answers = {};
    for (const [key, allowed] of Object.entries(ANSWER_RULES)) {
      const value = req.body[key];
      if (value === undefined || value === null || value === '') {
        answers[key] = '';
        continue;
      }
      if (!allowed.includes(value)) throw new HttpError(400, `${key}는 ${allowed.join(', ')} 중 하나여야 합니다.`);
      answers[key] = value;
    }
    if (!answers.mood && !answers.season && !answers.category && !answers.purpose) {
      throw new HttpError(400, '최소 한 개 이상의 답변을 선택해 주세요.');
    }

    const perfumes = await Perfume.findAll({
      order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    });
    if (perfumes.length === 0) throw new HttpError(404, '추천할 향수가 없습니다.');
    const result = calculateRecommendation(answers, perfumes);

    const saved = await RecommendHistory.create({
      userId: req.user ? req.user.id : null,
      mood: answers.mood,
      season: answers.season,
      category: answers.category,
      purpose: answers.purpose,
      perfumeId: result.perfume.id,
      score: result.score,
      matchedCriteria: result.matchedCriteria,
      reason: result.reason,
    });

    ok(res, {
      historyId: req.user ? saved.id : null,
      savedToHistory: Boolean(req.user),
      answers,
      perfume: result.perfume,
      score: result.score,
      matchedCriteria: result.matchedCriteria,
      reason: result.reason,
    });
  })
);

/**
 * [핵심 API 3] 내 맞춤 추천 기록 목록 조회 (히스토리 보관함)
 * - Method / Path: GET /api/recommend/history
 * - 핵심 로직: 로그인한 사용자가 과거에 설문 추천을 받았던 이력과 추천 사유를 최신순으로 조회
 */
router.get(
  '/history',
  auth,
  asyncHandler(async (req, res) => {
    const rows = await RecommendHistory.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
      include: [{ model: Perfume, as: 'perfume', attributes: ['id', 'brand', 'name', 'image'] }],
    });
    ok(res, rows.map(formatHistory));
  })
);

// 본인 기록인지 확인 (없으면 404, 남의 기록이면 403)
async function findOwnHistory(id, userId) {
  const history = await RecommendHistory.findByPk(id, {
    include: [{ model: Perfume, as: 'perfume', attributes: ['id', 'brand', 'name', 'image'] }],
  });
  if (!history) throw new HttpError(404, '추천 기록을 찾을 수 없습니다.');
  if (history.userId !== userId) throw new HttpError(403, '본인의 추천 기록만 볼 수 있습니다.');
  return history;
}

// 기록 상세: GET /api/recommend/history/:id
router.get(
  '/history/:id',
  auth,
  asyncHandler(async (req, res) => {
    const history = await findOwnHistory(req.params.id, req.user.id);
    ok(res, formatHistory(history));
  })
);

// 기록 삭제: DELETE /api/recommend/history/:id
router.delete(
  '/history/:id',
  auth,
  asyncHandler(async (req, res) => {
    const history = await findOwnHistory(req.params.id, req.user.id);
    await history.destroy();
    ok(res, { id: Number(req.params.id), message: '추천 기록이 삭제되었습니다.' });
  })
);

module.exports = router;
