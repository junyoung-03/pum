// 4. 추천 라우터 /api/recommend  (6개)
// GET    /questions        설문 질문과 보기 목록
// GET    /stats            많이 고른 답변, 많이 추천된 향수
// POST   /               ★ 답변 → 추천 결과 (로그인 선택, 로그인 시 내 기록에 저장)
// GET    /history          내 추천 기록 목록 (로그인)
// GET    /history/:id      기록 상세 (로그인, 본인만)
// DELETE /history/:id      기록 삭제 (로그인, 본인만)
const express = require('express');
const pool = require('../db/pool');
const { auth, optionalAuth } = require('../middlewares/auth');
const { HttpError, asyncHandler, ok } = require('../utils/http');
const { CATEGORIES, MOODS, SEASONS, PURPOSES } = require('../utils/constants');
const { toPerfume, toPerfumeSummary, parseJson } = require('../utils/perfume');

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
  const moodDesc = perfume.moodTags.slice(0, 2).join(', ');
  const purposeDesc = perfume.purpose.join(' 또는 ');
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
    if (answers.mood && perfume.mood.includes(answers.mood)) {
      score += 30;
      matchedCriteria.push(`${answers.mood} 분위기`);
    }
    if (answers.season && perfume.season.includes(answers.season)) {
      score += 25;
      matchedCriteria.push(`${answers.season} 계절`);
    }
    if (answers.category && perfume.category === answers.category) {
      score += 30;
      matchedCriteria.push(`${answers.category} 계열`);
    }
    if (answers.purpose && perfume.purpose.includes(answers.purpose)) {
      score += 15;
      matchedCriteria.push(`${answers.purpose} 용도`);
    }
    return { perfume, score, matchedCriteria };
  });

  // 점수가 같으면 컬렉션 순서(sort_order)가 앞인 향수 (프론트와 같은 결과)
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

const toHistory = (row) => ({
  id: row.id,
  answers: { mood: row.mood, season: row.season, category: row.category, purpose: row.purpose },
  perfume: row.perfume_id ? toPerfumeSummary({ id: row.perfume_id, brand: row.brand, name: row.name, image: row.image }) : null,
  score: row.score,
  matchedCriteria: parseJson(row.matched_criteria),
  reason: row.reason,
  createdAt: row.created_at,
});

const SELECT_HISTORY = `
  SELECT h.*, p.brand, p.name, p.image
    FROM recommend_history h
    LEFT JOIN perfumes p ON p.id = h.perfume_id`;

// 설문 질문: GET /api/recommend/questions
router.get(
  '/questions',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM recommend_questions ORDER BY sort_order ASC');
    ok(
      res,
      rows.map((r) => ({ id: r.id, key: r.q_key, title: r.title, subtitle: r.subtitle, options: parseJson(r.options) }))
    );
  })
);

// 통계: GET /api/recommend/stats
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM recommend_history');

    const topAnswers = {};
    for (const key of Object.keys(ANSWER_RULES)) {
      // key는 위 고정 목록에서만 오므로 컬럼명으로 써도 안전
      const [rows] = await pool.query(
        `SELECT ${key} AS value, COUNT(*) AS cnt
           FROM recommend_history
          WHERE ${key} <> ''
          GROUP BY ${key}
          ORDER BY cnt DESC, value ASC
          LIMIT 3`
      );
      topAnswers[key] = rows.map((r) => ({ value: r.value, count: Number(r.cnt) }));
    }

    const [perfumeRows] = await pool.query(
      `SELECT p.id, p.brand, p.name, p.image, COUNT(*) AS cnt
         FROM recommend_history h
         JOIN perfumes p ON p.id = h.perfume_id
        GROUP BY p.id, p.brand, p.name, p.image
        ORDER BY cnt DESC, p.id ASC
        LIMIT 5`
    );

    ok(res, {
      totalCount: Number(total),
      topAnswers,
      topPerfumes: perfumeRows.map((r) => ({ ...toPerfumeSummary(r), count: Number(r.cnt) })),
    });
  })
);

// ★ 추천 요청: POST /api/recommend  { mood, season, category, purpose }
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

    const [rows] = await pool.query('SELECT * FROM perfumes ORDER BY sort_order ASC, id ASC');
    if (rows.length === 0) throw new HttpError(404, '추천할 향수가 없습니다.');
    const result = calculateRecommendation(answers, rows.map(toPerfume));

    // 비로그인 요청도 통계용으로 저장 (user_id = NULL)
    const [saved] = await pool.query(
      `INSERT INTO recommend_history (user_id, mood, season, category, purpose, perfume_id, score, matched_criteria, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user ? req.user.id : null,
        answers.mood,
        answers.season,
        answers.category,
        answers.purpose,
        result.perfume.id,
        result.score,
        JSON.stringify(result.matchedCriteria),
        result.reason,
      ]
    );

    ok(res, {
      historyId: req.user ? saved.insertId : null,
      savedToHistory: Boolean(req.user),
      answers,
      perfume: result.perfume,
      score: result.score,
      matchedCriteria: result.matchedCriteria,
      reason: result.reason,
    });
  })
);

// 내 추천 기록: GET /api/recommend/history
router.get(
  '/history',
  auth,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(`${SELECT_HISTORY} WHERE h.user_id = ? ORDER BY h.created_at DESC, h.id DESC`, [
      req.user.id,
    ]);
    ok(res, rows.map(toHistory));
  })
);

// 본인 기록인지 확인 (없으면 404, 남의 기록이면 403)
async function findOwnHistory(id, userId) {
  const [rows] = await pool.query(`${SELECT_HISTORY} WHERE h.id = ?`, [id]);
  if (rows.length === 0) throw new HttpError(404, '추천 기록을 찾을 수 없습니다.');
  if (rows[0].user_id !== userId) throw new HttpError(403, '본인의 추천 기록만 볼 수 있습니다.');
  return rows[0];
}

// 기록 상세: GET /api/recommend/history/:id
router.get(
  '/history/:id',
  auth,
  asyncHandler(async (req, res) => {
    const row = await findOwnHistory(req.params.id, req.user.id);
    ok(res, toHistory(row));
  })
);

// 기록 삭제: DELETE /api/recommend/history/:id
router.delete(
  '/history/:id',
  auth,
  asyncHandler(async (req, res) => {
    await findOwnHistory(req.params.id, req.user.id);
    await pool.query('DELETE FROM recommend_history WHERE id = ?', [req.params.id]);
    ok(res, { id: Number(req.params.id), message: '추천 기록이 삭제되었습니다.' });
  })
);

module.exports = router;
