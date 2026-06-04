import { Review } from '../../types/review';

interface ReviewCardProps {
  review: Review;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`star ${i < rating ? 'star-filled' : ''}`}>
        ★
      </span>
    ));
  };

  return (
    <article className="review-card">
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
          {renderStars(review.rating)}
        </div>
      </div>
      <div className="review-perfume">
        <span className="perfume-label">리뷰 향수</span>
        <span className="perfume-name">{review.perfumeName}</span>
      </div>
      <p className="review-content">{review.content}</p>
    </article>
  );
}
