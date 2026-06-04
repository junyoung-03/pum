import { Perfume, RecommendAnswers, Mood, Season, Purpose, Category } from '../types/perfume';

interface RecommendationResult {
  perfume: Perfume;
  score: number;
  matchedCriteria: string[];
  reason: string;
}

export function calculateRecommendation(
  perfumes: Perfume[],
  answers: RecommendAnswers
): RecommendationResult | null {
  if (!answers.mood && !answers.season && !answers.category && !answers.purpose) {
    return null;
  }

  const results = perfumes.map((perfume) => {
    let score = 0;
    const matchedCriteria: string[] = [];

    if (answers.mood && perfume.mood.includes(answers.mood as Mood)) {
      score += 30;
      matchedCriteria.push(`${answers.mood} 분위기`);
    }

    if (answers.season && perfume.season.includes(answers.season as Season)) {
      score += 25;
      matchedCriteria.push(`${answers.season} 계절`);
    }

    if (answers.category && perfume.category === answers.category) {
      score += 30;
      matchedCriteria.push(`${answers.category} 계열`);
    }

    if (answers.purpose && perfume.purpose.includes(answers.purpose as Purpose)) {
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
      reason: generateReason(answers, perfumes[0], ['기본 추천'])
    };
  }

  return {
    ...best,
    reason: generateReason(answers, best.perfume, best.matchedCriteria)
  };
}

function generateReason(
  answers: RecommendAnswers,
  perfume: Perfume,
  matchedCriteria: string[]
): string {
  const parts: string[] = [];
  
  if (answers.mood) {
    parts.push(`"${answers.mood}" 분위기`);
  }
  if (answers.season) {
    parts.push(`${answers.season} 계절감`);
  }
  if (answers.category) {
    parts.push(`${answers.category} 계열 선호도`);
  }
  if (answers.purpose) {
    parts.push(`${answers.purpose} 목적`);
  }

  const criteriaText = parts.length > 0 
    ? `선택하신 ${parts.join(', ')}를 기준으로 분석했습니다.` 
    : '';

  const brandText = `${perfume.brand}의 ${perfume.name}은(는)`;
  
  const moodDesc = perfume.mood.slice(0, 2).join(', ');
  const purposeDesc = perfume.purpose.join(' 또는 ');

  return `${criteriaText} ${brandText} ${moodDesc} 무드를 연출하며, ${purposeDesc} 상황에 특히 잘 어울리는 향수입니다.`;
}

export function getSimilarPerfumes(
  perfumes: Perfume[],
  currentPerfume: Perfume,
  limit: number = 3
): Perfume[] {
  return perfumes
    .filter((p) => p.id !== currentPerfume.id)
    .map((p) => {
      let similarity = 0;
      if (p.category === currentPerfume.category) similarity += 3;
      const moodOverlap = p.mood.filter((m) => currentPerfume.mood.includes(m)).length;
      similarity += moodOverlap;
      const seasonOverlap = p.season.filter((s) => currentPerfume.season.includes(s)).length;
      similarity += seasonOverlap * 0.5;
      return { perfume: p, similarity };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map((item) => item.perfume);
}
