import { useEffect, useRef, useState, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { api, errorMessage, formatDate, toQuery } from '../api/client';
import type { RootState } from '../data/store';
import type { Perfume, Review, ReviewStats } from '../data/perfumeData';
import { Button } from '../components/shared';

type Sort = 'latest' | 'rating';

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star-btn ${star <= (hover || value) ? 'active' : ''}`}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          aria-label={`${star}점`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// 리뷰
//   GET    /api/reviews?perfumeId=&sort=&page=   목록
//   GET    /api/reviews/stats/:perfumeId          향수별 평균 별점
//   POST   /api/reviews                           작성 (로그인)
//   PUT    /api/reviews/:id                       수정 (본인)
//   DELETE /api/reviews/:id                       삭제 (본인)
export default function ReviewPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useSelector((state: RootState) => state.auth.user);

  const filterPerfumeId = searchParams.get('perfumeId') ?? '';
  const [sort, setSort] = useState<Sort>('latest');
  const [page, setPage] = useState(1);

  const [perfumes, setPerfumes] = useState<Perfume[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [listError, setListError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // 작성 폼
  const [perfumeId, setPerfumeId] = useState(filterPerfumeId);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const contentInputRef = useRef<HTMLTextAreaElement>(null);

  // 수정 중인 리뷰
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editContent, setEditContent] = useState('');

  // 향수 선택 목록
  useEffect(() => {
    api<Perfume[]>('/perfumes?limit=50')
      .then(({ data }) => setPerfumes(data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setPerfumeId(filterPerfumeId);
  }, [filterPerfumeId]);

  // 리뷰 목록 (필터·정렬·페이지가 바뀌면 다시 불러옴)
  useEffect(() => {
    const query = toQuery({ perfumeId: filterPerfumeId, sort, page, limit: 10 });
    api<Review[]>(`/reviews${query}`)
      .then(({ data, pagination }) => {
        setReviews((prev) => (page === 1 ? data : [...prev, ...data]));
        setTotal(pagination?.total ?? data.length);
        setTotalPages(pagination?.totalPages ?? 1);
        setListError('');
      })
      .catch((err) => setListError(errorMessage(err)));
  }, [filterPerfumeId, sort, page, reloadKey]);

  // 특정 향수를 골랐으면 평균 별점 표시
  useEffect(() => {
    if (!filterPerfumeId) {
      setStats(null);
      return;
    }
    api<ReviewStats>(`/reviews/stats/${filterPerfumeId}`)
      .then(({ data }) => setStats(data))
      .catch(() => setStats(null));
  }, [filterPerfumeId, reloadKey]);

  const reload = () => {
    setPage(1);
    setReloadKey((k) => k + 1);
  };

  const changeFilter = (value: string) => {
    setPage(1);
    setSearchParams(value ? { perfumeId: value } : {});
  };

  const changeSort = (value: Sort) => {
    setPage(1);
    setSort(value);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!perfumeId) newErrors.perfumeId = '향수를 선택해 주세요.';
    if (rating === 0) newErrors.rating = '별점을 선택해 주세요.';
    if (!content.trim()) newErrors.content = '후기 내용을 입력해 주세요.';
    setErrors(newErrors);
    if (newErrors.content) contentInputRef.current?.focus();
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api<Review>('/reviews', 'POST', { perfumeId, rating, content: content.trim() });
      setRating(0);
      setContent('');
      setErrors({});
      reload();
    } catch (err) {
      setErrors({ submit: errorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (review: Review) => {
    setEditingId(review.id);
    setEditRating(review.rating);
    setEditContent(review.content);
  };

  const handleUpdate = async (id: number) => {
    if (!editContent.trim()) {
      alert('후기 내용을 입력해 주세요.');
      return;
    }
    try {
      const { data } = await api<Review>(`/reviews/${id}`, 'PUT', { rating: editRating, content: editContent.trim() });
      setReviews((list) => list.map((r) => (r.id === id ? data : r)));
      setEditingId(null);
      if (filterPerfumeId) setReloadKey((k) => k + 1);
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('이 리뷰를 삭제할까요?')) return;
    try {
      await api(`/reviews/${id}`, 'DELETE');
      reload();
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  return (
    <div className="review-page">
      <div className="container">
        <div className="section-title section-title-center">
          <h2>Reviews</h2>
          <p>향수를 사용해본 분들의 생생한 후기</p>
        </div>

        <div className="review-layout">
          <div className="review-form-section">
            {user ? (
              <form className="review-form" onSubmit={handleSubmit}>
                <h3>리뷰 작성</h3>
                <p className="form-author">
                  작성자 <strong>{user.nickname}</strong>
                </p>

                <div className="form-group">
                  <label htmlFor="perfumeId">향수 선택</label>
                  <select
                    id="perfumeId"
                    value={perfumeId}
                    onChange={(e) => setPerfumeId(e.target.value)}
                    className={errors.perfumeId ? 'error' : ''}
                  >
                    <option value="">향수를 선택해 주세요</option>
                    {perfumes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.brand} - {p.name}
                      </option>
                    ))}
                  </select>
                  {errors.perfumeId && <span className="error-message">{errors.perfumeId}</span>}
                </div>

                <div className="form-group">
                  <label>별점</label>
                  <StarInput value={rating} onChange={setRating} />
                  {errors.rating && <span className="error-message">{errors.rating}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="content">후기</label>
                  <textarea
                    ref={contentInputRef}
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="향수 사용 후기를 작성해 주세요"
                    rows={5}
                    maxLength={1000}
                    className={errors.content ? 'error' : ''}
                  />
                  {errors.content && <span className="error-message">{errors.content}</span>}
                </div>

                {errors.submit && <p className="notice notice-error">{errors.submit}</p>}

                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? '등록 중...' : '리뷰 등록'}
                </Button>
              </form>
            ) : (
              <div className="review-form">
                <h3>리뷰 작성</h3>
                <p className="muted-text">리뷰를 작성하려면 로그인이 필요합니다.</p>
                <Button variant="primary" onClick={() => navigate('/login', { state: { from: '/review' } })}>
                  로그인하고 리뷰 쓰기
                </Button>
              </div>
            )}
          </div>

          <div className="review-list-section">
            <div className="review-toolbar">
              <h3 className="review-list-title">
                리뷰 <span className="review-count">{total}</span>
              </h3>
              <div className="review-filters">
                <select value={filterPerfumeId} onChange={(e) => changeFilter(e.target.value)} aria-label="향수별 보기">
                  <option value="">전체 향수</option>
                  {perfumes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.brand} {p.name}
                    </option>
                  ))}
                </select>
                <div className="sort-toggle">
                  <button type="button" className={sort === 'latest' ? 'active' : ''} onClick={() => changeSort('latest')}>
                    최신순
                  </button>
                  <button type="button" className={sort === 'rating' ? 'active' : ''} onClick={() => changeSort('rating')}>
                    별점순
                  </button>
                </div>
              </div>
            </div>

            {stats && stats.reviewCount > 0 && (
              <p className="review-stats-line">
                평균 별점 <strong>★ {stats.averageRating.toFixed(1)}</strong> · 리뷰 {stats.reviewCount}개
              </p>
            )}

            {listError && <p className="notice notice-error">{listError}</p>}

            {reviews.length > 0 ? (
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
                      {editingId === review.id ? (
                        <StarInput value={editRating} onChange={setEditRating} />
                      ) : (
                        <div className="review-rating">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i} className={`star ${i < review.rating ? 'star-filled' : ''}`}>
                              ★
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="review-perfume">
                      <span className="perfume-label">리뷰 향수</span>
                      <span className="perfume-name">{review.perfumeName}</span>
                    </div>

                    {editingId === review.id ? (
                      <div className="review-edit">
                        <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={4} maxLength={1000} />
                        <div className="inline-actions">
                          <Button size="small" variant="primary" onClick={() => handleUpdate(review.id)}>
                            저장
                          </Button>
                          <Button size="small" variant="ghost" onClick={() => setEditingId(null)}>
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="review-content">{review.content}</p>
                    )}

                    {user && user.id === review.userId && editingId !== review.id && (
                      <div className="review-owner-actions">
                        <button type="button" onClick={() => startEdit(review)}>
                          수정
                        </button>
                        <button type="button" onClick={() => handleDelete(review.id)}>
                          삭제
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              !listError && (
                <div className="empty-state">
                  <div className="empty-state-icon">✍</div>
                  <h3>아직 리뷰가 없습니다</h3>
                  <p>첫 번째 리뷰를 작성해보세요!</p>
                </div>
              )
            )}

            {page < totalPages && (
              <div className="load-more">
                <Button variant="secondary" size="small" onClick={() => setPage((p) => p + 1)}>
                  리뷰 더 보기
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
