import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { perfumeData } from '../data/perfumeData';
import { getSimilarPerfumes } from '../utils/recommendation';
import { useFavorites } from '../hooks/useFavorites';
import PerfumeDetailInfo from '../components/perfume/PerfumeDetailInfo';
import Button from '../components/common/Button';
import SectionTitle from '../components/common/SectionTitle';
import EmptyState from '../components/common/EmptyState';
import PerfumeImage from '../components/perfume/PerfumeImage';

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toggleFavorite, isFavorite } = useFavorites();

  const perfume = useMemo(() => {
    return perfumeData.find((p) => p.id === id);
  }, [id]);

  const similarPerfumes = useMemo(() => {
    if (!perfume) return [];
    return getSimilarPerfumes(perfumeData, perfume, 3);
  }, [perfume]);

  if (!perfume) {
    return (
      <div className="detail-page">
        <div className="container">
          <EmptyState
            icon="?"
            title="향수를 찾을 수 없습니다"
            description="요청하신 향수 정보가 존재하지 않습니다."
            actionLabel="컬렉션으로 돌아가기"
            onAction={() => navigate('/collection')}
          />
        </div>
      </div>
    );
  }

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
            <PerfumeDetailInfo perfume={perfume} />

            <div className="detail-actions">
              <Button
                variant={isFavorite(perfume.id) ? 'primary' : 'ghost'}
                onClick={() => toggleFavorite(perfume.id)}
              >
                {isFavorite(perfume.id) ? '♥ 찜 해제' : '♡ 찜하기'}
              </Button>
              <Link to="/collection">
                <Button variant="secondary">컬렉션으로 돌아가기</Button>
              </Link>
            </div>
          </div>
        </div>

        {similarPerfumes.length > 0 && (
          <section className="similar-section">
            <SectionTitle 
              title="비슷한 향수" 
              subtitle="이 향수와 비슷한 느낌의 향수들"
              align="left"
            />
            <div className="similar-grid">
              {similarPerfumes.map((similar) => (
                <Link 
                  key={similar.id} 
                  to={`/perfume/${similar.id}`}
                  className="similar-card"
                >
                  <PerfumeImage perfume={similar} className="similar-image" size="small" />
                  <div className="similar-info">
                    <p className="similar-brand">{similar.brand}</p>
                    <p className="similar-name">{similar.name}</p>
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
