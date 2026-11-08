import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage, formatDate } from '../api/client';
import type { Perfume, Review, ReviewStats, SimilarPerfume } from '../data/perfumeData';
import useFavorite from '../data/useFavorite';
import { Badge, Button, PerfumeImage } from '../components/shared';

// 향수 상세
//   GET /api/perfumes/:id            상세 정보
//   GET /api/perfumes/:id/similar    비슷한 향수 (유사도 점수 순)
//   GET /api/reviews/stats/:id       평균 별점·별점 분포
//   GET /api/reviews?perfumeId=:id   이 향수의 리뷰
export default function DetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { favoriteIds, toggleFavorite } = useFavorite();

  const [perfume, setPerfume] = useState<Perfume | null>(null);
  const [similarPerfumes, setSimilarPerfumes] = useState<SimilarPerfume[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    setPerfume(null);
    api<Perfume>(`/perfumes/${id}`)
      .then(({ data }) => {
        setPerfume(data);
        return Promise.all([
          api<SimilarPerfume[]>(`/perfumes/${id}/similar?limit=3`),
          api<ReviewStats>(`/reviews/stats/${id}`),
          api<Review[]>(`/reviews?perfumeId=${id}&limit=3`)
        ]);
      })
      .then(([similar, statsRes, reviewRes]) => {
        setSimilarPerfumes(similar.data);
        setStats(statsRes.data);
        setReviews(reviewRes.data);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading && !perfume) {
    return (
      <div className="detail-page">
        <div className="container">
          <p className="loading-block">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!perfume) {
    return (
      <div className="detail-page">
        <div className="container">
          <div className="empty-state">
            <div className="empty-state-icon">?</div>
            <h3>향수를 찾을 수 없습니다</h3>
            <p>{error || '요청하신 향수 정보가 존재하지 않습니다.'}</p>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/list')}>
              컬렉션으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isFavorite = favoriteIds.includes(perfume.id);
  const maxCount = stats ? Math.max(1, ...Object.values(stats.distribution)) : 1;

  return (
    <div className="detail-page">
      <div className="container">
        <div className="detail-content">
          <div className="detail-image">
            <PerfumeImage
              perfume={perfume}
              className="detail-image-placeholder"
              size="large"
            />
          </div>

          <div className="detail-info-wrapper">
            <div className="perfume-detail-info">
              <div className="detail-header">
                <p className="detail-brand">{perfume.brand}</p>
                <h1 className="detail-name">{perfume.name}</h1>
                <div className="detail-badges">
                  <Badge variant="category">{perfume.noteFamily}</Badge>
                  <Badge>{perfume.price}</Badge>
                  {perfume.featured && <Badge variant="mood">Best Collection</Badge>}
                </div>
                {stats && stats.reviewCount > 0 && (
                  <p className="detail-rating">
                    <span className="star star-filled">★</span> {stats.averageRating.toFixed(1)}
                    <span className="detail-rating-count"> · 리뷰 {stats.reviewCount}개</span>
                  </p>
                )}
              </div>

              <p className="detail-highlight">{perfume.highlight}</p>
              <p className="detail-description">{perfume.description}</p>

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

              <div className="detail-meta">
                <div className="meta-item">
                  <h4>향 계열</h4>
                  <p>{perfume.noteFamily}</p>
                </div>
                <div className="meta-item">
                  <h4>무드</h4>
                  <p>{perfume.moodTags.join(', ')}</p>
                </div>
                <div className="meta-item">
                  <h4>추천 계절</h4>
                  <p>{perfume.season.join(', ')}</p>
                </div>
                <div className="meta-item">
                  <h4>추천 상황</h4>
                  <p>{perfume.purpose.join(', ')}</p>
                </div>
              </div>
            </div>

            <div className="detail-actions">
              <Button
                variant={isFavorite ? 'primary' : 'ghost'}
                onClick={() => toggleFavorite(perfume.id)}
              >
                {isFavorite ? '♥ 찜 해제' : '♡ 찜하기'}
              </Button>
              <Link to={`/review?perfumeId=${perfume.id}`} className="btn btn-secondary btn-medium">
                리뷰 쓰기
              </Link>
              <Link to={`/market?brand=${encodeURIComponent(perfume.brand)}`} className="btn btn-ghost btn-medium">
                중고 매물 보기
              </Link>
            </div>
          </div>
        </div>

        <section className="detail-review-section">
          <div className="section-title section-title-left">
            <h2>Reviews</h2>
            <p>이 향수를 사용해 본 회원들의 평가</p>
          </div>

          {stats && stats.reviewCount > 0 ? (
            <div className="rating-summary">
              <div className="rating-average">
                <strong>{stats.averageRating.toFixed(1)}</strong>
                <div className="review-rating">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={`star ${i < Math.round(stats.averageRating) ? 'star-filled' : ''}`}>
                      ★
                    </span>
                  ))}
                </div>
                <span>리뷰 {stats.reviewCount}개</span>
              </div>
              <div className="rating-bars">
                {[5, 4, 3, 2, 1].map((score) => (
                  <div key={score} className="rating-bar-row">
                    <span>{score}점</span>
                    <div className="rating-bar-track">
                      <div
                        className="rating-bar-fill"
                        style={{ width: `${(stats.distribution[score] / maxCount) * 100}%` }}
                      />
                    </div>
                    <span>{stats.distribution[score]}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="muted-text">아직 리뷰가 없습니다. 첫 번째 리뷰를 남겨 보세요.</p>
          )}

          {reviews.length > 0 && (
            <div className="review-list">
              {reviews.map((review) => (
                <article key={review.id} className="review-card">
                  <div className="review-header">
                    <div className="review-author">
                      <div className="author-avatar">{review.authorName.charAt(0).toUpperCase()}</div>
                      <div className="author-info">
                        <p className="author-name">{review.authorName}</p>
                        <p className="review-date">{formatDate(review.createdAt)}</p>
                      </div>
                    </div>
                    <div className="review-rating">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i} className={`star ${i < review.rating ? 'star-filled' : ''}`}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="review-content">{review.content}</p>
                </article>
              ))}
            </div>
          )}

          <div className="section-cta-left">
            <Link to={`/review?perfumeId=${perfume.id}`} className="btn btn-secondary btn-small">
              리뷰 전체 보기 · 작성하기
            </Link>
          </div>
        </section>

        {similarPerfumes.length > 0 && (
          <section className="similar-section">
            <div className="section-title section-title-left">
              <h2>비슷한 향수</h2>
              <p>향 계열·무드·계절이 비슷한 순서로 골랐어요</p>
            </div>
            <div className="similar-grid">
              {similarPerfumes.map((similar) => (
                <Link key={similar.id} to={`/detail/${similar.id}`} className="similar-card">
                  <PerfumeImage perfume={similar} className="similar-image" size="small" />
                  <div className="similar-info">
                    <p className="similar-brand">{similar.brand}</p>
                    <p className="similar-name">{similar.name}</p>
                    <p className="similar-score">유사도 {similar.similarity}점</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
