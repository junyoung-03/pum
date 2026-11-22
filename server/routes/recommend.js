// 4. 추천 라우터 /api/recommend  (6개)
// GET    /questions        설문 질문과 보기 목록
// GET    /stats            많이 고른 답변, 많이 추천된 향수
// POST   /               ★ 답변 → 추천 결과 (로그인 선택, 로그인 시 내 기록에 저장)
// GET    /history          내 추천 기록 목록 (로그인)
// GET    /history/:id      기록 상세 (로그인, 본인만)
// DELETE /history/:id      기록 삭제 (로그인, 본인만)
const express = require('express');
const { RecommendQuestion, RecommendHistory } = require('../models');
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

/**
 * [핵심 API 1] 추천 설문 질문 및 선택지 조회
 * - Method / Path: GET /api/recommend/questions
 * - 핵심 로직: Sequelize `RecommendQuestion` 모델에서 문항 및 선택지 목록 순서대로 반환
 */
router.get(
  '/questions',
  asyncHandler(async (req, res) => {
    ok(res, await RecommendQuestion.listQuestions());
  })
);

// 통계: GET /api/recommend/stats
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    ok(res, await RecommendHistory.statistics());
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

    ok(res, await RecommendHistory.recommend(answers, req.user ? req.user.id : null));
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
    const rows = await RecommendHistory.listOwn(req.user.id);
    ok(res, rows);
  })
);

// 기록 상세: GET /api/recommend/history/:id
router.get(
  '/history/:id',
  auth,
  asyncHandler(async (req, res) => {
    const history = await RecommendHistory.findOwn(req.params.id, req.user.id);
    ok(res, history);
  })
);

// 기록 삭제: DELETE /api/recommend/history/:id
router.delete(
  '/history/:id',
  auth,
  asyncHandler(async (req, res) => {
    await RecommendHistory.removeOwn(req.params.id, req.user.id);
    ok(res, { id: Number(req.params.id), message: '추천 기록이 삭제되었습니다.' });
  })
);

module.exports = router;
