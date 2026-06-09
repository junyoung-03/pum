import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  perfumeData,
  Perfume,
  RecommendAnswers,
  Mood,
  Season,
  Purpose
} from '../data/perfumeData';
import { toggleFavorite, resetAnswers } from '../data/store';
import type { RootState } from '../data/store';
import { Badge, Button, EmptyState, PerfumeImage, NoteList } from '../components/shared';

function generateReason(answers: RecommendAnswers, perfume: Perfume) {
  const parts: string[] = [];

  if (answers.mood) parts.push(`"${answers.mood}" 분위기`);
  if (answers.season) parts.push(`${answers.season} 계절감`);
  if (answers.category) parts.push(`${answers.category} 계열 선호도`);
  if (answers.purpose) parts.push(`${answers.purpose} 목적`);

  const criteriaText =
    parts.length > 0 ? `선택하신 ${parts.join(', ')}를 기준으로 분석했습니다.` : '';

  const brandText = `${perfume.brand}의 ${perfume.name}은(는)`;
  const moodDesc = perfume.moodTags.slice(0, 2).join(', ');
  const purposeDesc = perfume.purpose.join(' 또는 ');

  return `${criteriaText} ${brandText} ${moodDesc} 무드를 연출하며, ${purposeDesc} 상황에 특히 잘 어울리는 향수입니다.`;
}

function calculateRecommendation(answers: RecommendAnswers) {
  if (!answers.mood && !answers.season && !answers.category && !answers.purpose) {
    return null;
  }

  const results = perfumeData.map((perfume) => {
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
      perfume: perfumeData[0],
      score: 50,
      matchedCriteria: ['기본 추천'],
      reason: generateReason(answers, perfumeData[0])
    };
  }

  return {
    ...best,
    reason: generateReason(answers, best.perfume)
  };
}

export default function ResultPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const answers = useSelector((state: RootState) => state.recommend.answers);
  const favoriteIds = useSelector((state: RootState) => state.favorite.ids);

  const recommendation = useMemo(() => calculateRecommendation(answers), [answers]);

  const handleRetry = () => {
    dispatch(resetAnswers());
    navigate('/recommend');
  };

  if (!answers.mood && !answers.season && !answers.category && !answers.purpose) {
    return (
      <div className="result-page">
        <div className="container">
          <EmptyState
            icon="?"
            title="추천 결과가 없습니다"
            description="먼저 향수 추천 설문을 완료해주세요."
            actionLabel="추천받으러 가기"
            onAction={() => navigate('/recommend')}
          />
        </div>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div className="result-page">
        <div className="container">
          <EmptyState
            icon="!"
            title="추천 결과를 찾을 수 없습니다"
            description="다시 추천을 받아보시겠어요?"
            actionLabel="다시 추천받기"
            onAction={handleRetry}
          />
        </div>
      </div>
    );
  }

  const { perfume, score, reason } = recommendation;
  const isFavorite = favoriteIds.includes(perfume.id);

  return (
    <div className="result-page">
      <div className="container result-container">
        <div className="result-card">
          <div className="result-header">
            <h2>당신을 위한 향수</h2>
            <p className="result-subtitle">Your Perfect Match</p>
          </div>

          <div className="result-content">
            <div className="result-perfume-image">
              <PerfumeImage
                perfume={perfume}
                className="result-image-placeholder"
                size="large"
              />
            </div>

            <div className="result-perfume-info">
              <div className="result-score">
                <span className="score-label">매칭 점수</span>
                <span className="score-value">{score}%</span>
              </div>

              <p className="result-brand">{perfume.brand}</p>
              <h3 className="result-name">{perfume.name}</h3>

              <div className="result-badges">
                <Badge variant="category">{perfume.noteFamily}</Badge>
                {perfume.moodTags.slice(0, 2).map((m) => (
                  <Badge key={m} variant="mood">
                    {m}
                  </Badge>
                ))}
              </div>

              <p className="result-reason">{reason}</p>

              <div className="result-selection">
                <h4>선택한 조건</h4>
                <div className="selection-tags">
                  {answers.mood && <span>{answers.mood}</span>}
                  {answers.season && <span>{answers.season}</span>}
                  {answers.category && <span>{answers.category}</span>}
                  {answers.purpose && <span>{answers.purpose}</span>}
                </div>
              </div>

              <NoteList
                topNote={perfume.topNote}
                middleNote={perfume.middleNote}
                baseNote={perfume.baseNote}
              />

              <div className="result-actions">
                <Button
                  variant="ghost"
                  onClick={() => dispatch(toggleFavorite(perfume.id))}
                  className={isFavorite ? 'favorite-active' : ''}
                >
                  {isFavorite ? '♥ 찜 해제' : '♡ 찜하기'}
                </Button>
                <Link to={`/detail/${perfume.id}`} state={{ perfume }}>
                  <Button variant="secondary">상세보기</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="result-bottom-actions">
          <Button variant="ghost" onClick={handleRetry}>
            다시 추천받기
          </Button>
          <Link to="/list">
            <Button variant="secondary">컬렉션 보러가기</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
