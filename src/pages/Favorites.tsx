import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { perfumeData } from '../data/perfumeData';
import { useFavorites } from '../hooks/useFavorites';
import PerfumeGrid from '../components/perfume/PerfumeGrid';
import SectionTitle from '../components/common/SectionTitle';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';

export default function Favorites() {
  const navigate = useNavigate();
  const { favoriteIds, toggleFavorite } = useFavorites();

  const favoritePerfumes = useMemo(() => {
    return perfumeData.filter((perfume) => favoriteIds.includes(perfume.id));
  }, [favoriteIds]);

  return (
    <div className="favorites-page">
      <div className="container">
        <SectionTitle 
          title="My Favorites" 
          subtitle="내가 찜한 향수 컬렉션"
        />

        {favoritePerfumes.length > 0 ? (
          <>
            <p className="favorites-count">
              총 <strong>{favoritePerfumes.length}</strong>개의 향수를 찜했습니다
            </p>
            <PerfumeGrid
              perfumes={favoritePerfumes}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
            />
          </>
        ) : (
          <EmptyState
            icon="♡"
            title="아직 찜한 향수가 없습니다"
            description="마음에 드는 향수를 저장하고 나만의 향수 컬렉션을 만들어보세요."
            actionLabel="컬렉션 보러가기"
            onAction={() => navigate('/collection')}
          />
        )}

        {favoritePerfumes.length > 0 && (
          <div className="favorites-cta">
            <Button variant="secondary" onClick={() => navigate('/collection')}>
              더 많은 향수 보기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
