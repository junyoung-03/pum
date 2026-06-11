import { useState, useRef, FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { perfumeData } from '../data/perfumeData';
import { addReview } from '../data/store';
import type { RootState } from '../data/store';
import { Button } from '../components/shared';

export default function ReviewPage() {
  const dispatch = useDispatch();
  const reviews = useSelector((state: RootState) => state.review.list);

  const [perfumeName, setPerfumeName] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hoverRating, setHoverRating] = useState(0);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const contentInputRef = useRef<HTMLTextAreaElement>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!authorName.trim()) newErrors.authorName = '이름을 입력해 주세요.';
    if (!perfumeName) newErrors.perfumeName = '향수를 선택해 주세요.';
    if (rating === 0) newErrors.rating = '별점을 선택해 주세요.';
    if (!content.trim()) newErrors.content = '후기 내용을 입력해 주세요.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      if (errors.authorName) nameInputRef.current?.focus();
      else if (errors.content) contentInputRef.current?.focus();
      return;
    }

    dispatch(
      addReview({
        perfumeName,
        authorName: authorName.trim(),
        rating,
        content: content.trim()
      })
    );

    setPerfumeName('');
    setAuthorName('');
    setRating(0);
    setContent('');
    setErrors({});
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
            <form className="review-form" onSubmit={handleSubmit}>
              <h3>리뷰 작성</h3>

              <div className="form-group">
                <label htmlFor="authorName">이름</label>
                <input
                  ref={nameInputRef}
                  type="text"
                  id="authorName"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="이름을 입력해 주세요"
                  className={errors.authorName ? 'error' : ''}
                />
                {errors.authorName && (
                  <span className="error-message">{errors.authorName}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="perfumeName">향수 선택</label>
                <select
                  id="perfumeName"
                  value={perfumeName}
                  onChange={(e) => setPerfumeName(e.target.value)}
                  className={errors.perfumeName ? 'error' : ''}
                >
                  <option value="">향수를 선택해 주세요</option>
                  {perfumeData.map((p) => (
                    <option key={p.id} value={`${p.brand} ${p.name}`}>
                      {p.brand} - {p.name}
                    </option>
                  ))}
                </select>
                {errors.perfumeName && (
                  <span className="error-message">{errors.perfumeName}</span>
                )}
              </div>

              <div className="form-group">
                <label>별점</label>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${star <= (hoverRating || rating) ? 'active' : ''}`}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      ★
                    </button>
                  ))}
                </div>
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
                  className={errors.content ? 'error' : ''}
                />
                {errors.content && <span className="error-message">{errors.content}</span>}
              </div>

              <Button type="submit" variant="primary">
                리뷰 등록
              </Button>
            </form>
          </div>

          <div className="review-list-section">
            <h3 className="review-list-title">
              리뷰 <span className="review-count">{reviews.length}</span>
            </h3>

            {reviews.length > 0 ? (
              <div className="review-list">
                {reviews.map((review) => (
                  <article key={review.id} className="review-card">
                    <div className="review-header">
                      <div className="review-author">
                        <div className="author-avatar">
                          {review.authorName.charAt(0).toUpperCase()}
                        </div>
                        <div className="author-info">
                          <p className="author-name">{review.authorName}</p>
                          <p className="review-date">{formatDate(review.createdAt)}</p>
                        </div>
                      </div>
                      <div className="review-rating">
                        {Array.from({ length: 5 }, (_, i) => (
                          <span
                            key={i}
                            className={`star ${i < review.rating ? 'star-filled' : ''}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="review-perfume">
                      <span className="perfume-label">리뷰 향수</span>
                      <span className="perfume-name">{review.perfumeName}</span>
                    </div>
                    <p className="review-content">{review.content}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">✍</div>
                <h3>아직 리뷰가 없습니다</h3>
                <p>첫 번째 리뷰를 작성해보세요!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
