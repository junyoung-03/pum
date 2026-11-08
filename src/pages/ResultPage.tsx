import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../api/client';
import { resetAnswers } from '../data/store';
import type { RootState } from '../data/store';
import type { RecommendStats } from '../data/perfumeData';
import useFavorite from '../data/useFavorite';
import { Badge, Button, PerfumeImage } from '../components/shared';

// 추천 결과: RecommendPage에서 POST /api/recommend로 받은 결과를 보여줌
// 아래쪽 통계: GET /api/recommend/stats
export default function ResultPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const result = useSelector((state: RootState) => state.recommend.result);
  const isLoggedIn = useSelector((state: RootState) => Boolean(state.auth.token));
  const { favoriteIds, toggleFavorite } = useFavorite();
  const [stats, setStats] = useState<RecommendStats | null>(null);

  useEffect(() => {
    api<RecommendStats>('/recommend/stats')
      .then(({ data }) => setStats(data))
      .catch(() => undefined);
  }, []);

  const handleRetry = () => {
    dispatch(resetAnswers());
    navigate('/recommend');
  };

  if (!result) {
    return (
      <div className="result-page">
        <div className="container">
          <div className="empty-state">
            <div className="empty-state-icon">?</div>
            <h3>추천 결과가 없습니다</h3>
            <p>먼저 향수 추천 설문을 완료해주세요.</p>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/recommend')}>
              추천받으러 가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { perfume, score, reason, answers, matchedCriteria } = result;
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

              <div className="result-selection">
                <h4>일치한 조건</h4>
                <div className="selection-tags">
                  {matchedCriteria.map((c) => (
                    <span key={c}>✓ {c}</span>
                  ))}
                </div>
              </div>

              <div className="note-list">
                <div className="note-item">
                  <h4>Top Note</h4>
                  <p>{perfume.topNote.join(', ')}</p>
                </div>
                <div className="note-item">
                  <h4>Middle Note</h4>
                  <p>{perfume.middleNote.join(', ')}</p>
                </div>
                <div className="note-item">
                  <h4>Base Note</h4>
                  <p>{perfume.baseNote.join(', ')}</p>
                </div>
              </div>

              <div className="result-actions">
                <Button
                  variant="ghost"
                  onClick={() => toggleFavorite(perfume.id)}
                  className={isFavorite ? 'favorite-active' : ''}
                >
                  {isFavorite ? '♥ 찜 해제' : '♡ 찜하기'}
                </Button>
                <Link to={`/detail/${perfume.id}`} className="btn btn-secondary btn-medium">
                  상세보기
                </Link>
              </div>
            </div>
          </div>

          <p className={`notice ${result.savedToHistory ? 'notice-info' : 'notice-muted'} result-notice`}>
            {result.savedToHistory ? (
              <>
                이 추천 결과가 내 추천 기록에 저장되었습니다. <Link to="/recommend/history">추천 기록 보기 →</Link>
              </>
            ) : isLoggedIn ? (
              '추천 결과를 확인했습니다.'
            ) : (
              <>
                로그인하면 추천 결과가 내 추천 기록에 저장돼요. <Link to="/login">로그인 →</Link>
              </>
            )}
          </p>
        </div>

        {stats && stats.topPerfumes.length > 0 && (
          <div className="result-stats">
            <h4>다른 회원들이 많이 추천받은 향수</h4>
            <ol>
              {stats.topPerfumes.slice(0, 3).map((p) => (
                <li key={p.id}>
                  <Link to={`/detail/${p.id}`}>
                    {p.brand} {p.name}
                  </Link>
                  <span>{p.count}회</span>
                </li>
              ))}
            </ol>
            <p className="muted-text">지금까지 총 {stats.totalCount}번 추천했어요.</p>
          </div>
        )}

        <div className="result-bottom-actions">
          <Button variant="ghost" onClick={handleRetry}>
            다시 추천받기
          </Button>
          <Link to="/list" className="btn btn-secondary btn-medium">
            컬렉션 보러가기
          </Link>
        </div>
      </div>
    </div>
  );
}
