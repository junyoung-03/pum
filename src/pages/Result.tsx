import { useMemo, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RecommendAnswers } from '../types/perfume';
import { perfumeData } from '../data/perfumeData';
import { calculateRecommendation } from '../utils/recommendation';
import { useFavorites } from '../hooks/useFavorites';
import ResultCard from '../components/recommend/ResultCard';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';

export default function Result() {
  const navigate = useNavigate();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [answers, setAnswers] = useState<RecommendAnswers | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('scentique-answers');
    if (stored) {
      try {
        setAnswers(JSON.parse(stored));
      } catch {
        setAnswers(null);
      }
    }
  }, []);

  const recommendation = useMemo(() => {
    if (!answers) return null;
    return calculateRecommendation(perfumeData, answers);
  }, [answers]);

  const handleRetry = () => {
    sessionStorage.removeItem('scentique-answers');
    navigate('/recommend');
  };

  if (!answers) {
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

  return (
    <div className="result-page">
      <div className="container result-container">
        <ResultCard
          perfume={recommendation.perfume}
          score={recommendation.score}
          reason={recommendation.reason}
          answers={answers}
          isFavorite={isFavorite(recommendation.perfume.id)}
          onToggleFavorite={toggleFavorite}
        />

        <div className="result-bottom-actions">
          <Button variant="ghost" onClick={handleRetry}>
            다시 추천받기
          </Button>
          <Link to="/collection">
            <Button variant="secondary">컬렉션 보러가기</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
