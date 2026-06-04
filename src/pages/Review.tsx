import { useState, useEffect } from 'react';
import { Review as ReviewType } from '../types/review';
import ReviewForm from '../components/review/ReviewForm';
import ReviewCard from '../components/review/ReviewCard';
import SectionTitle from '../components/common/SectionTitle';
import EmptyState from '../components/common/EmptyState';

const STORAGE_KEY = 'scentique-reviews';

const initialReviews: ReviewType[] = [
  {
    id: 'review-1',
    perfumeName: 'Maison Francis Kurkdjian Baccarat Rouge 540',
    authorName: '향수러버',
    rating: 5,
    content: '정말 환상적인 향입니다. 처음 맡았을 때 감동받아서 바로 구매했어요. 잔향도 오래가고, 어디서나 칭찬받는 향수입니다. 특별한 날에 뿌리면 하루종일 기분이 좋아져요.',
    createdAt: '2024-01-15T09:30:00Z'
  },
  {
    id: 'review-2',
    perfumeName: 'JO MALONE English Pear & Freesia',
    authorName: '데일리향수',
    rating: 4,
    content: '일상에서 쓰기 정말 좋은 향수예요. 너무 강하지 않고 은은하게 퍼져서 오피스에서도 부담없이 사용할 수 있어요. 배와 프리지아 향이 정말 청초해요.',
    createdAt: '2024-01-10T14:20:00Z'
  }
];

export default function Review() {
  const [reviews, setReviews] = useState<ReviewType[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setReviews(parsed);
      } catch {
        setReviews(initialReviews);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialReviews));
      }
    } else {
      setReviews(initialReviews);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialReviews));
    }
  }, []);

  useEffect(() => {
    if (reviews.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
    }
  }, [reviews]);

  const handleSubmitReview = (reviewData: {
    perfumeName: string;
    authorName: string;
    rating: number;
    content: string;
  }) => {
    const newReview: ReviewType = {
      id: `review-${Date.now()}`,
      ...reviewData,
      createdAt: new Date().toISOString()
    };

    setReviews((prev) => [newReview, ...prev]);
  };

  return (
    <div className="review-page">
      <div className="container">
        <SectionTitle 
          title="Reviews" 
          subtitle="향수를 사용해본 분들의 생생한 후기"
        />

        <div className="review-layout">
          <div className="review-form-section">
            <ReviewForm onSubmit={handleSubmitReview} />
          </div>

          <div className="review-list-section">
            <h3 className="review-list-title">
              리뷰 <span className="review-count">{reviews.length}</span>
            </h3>
            
            {reviews.length > 0 ? (
              <div className="review-list">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="✍"
                title="아직 리뷰가 없습니다"
                description="첫 번째 리뷰를 작성해보세요!"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
