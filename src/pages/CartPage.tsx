import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { perfumeData } from '../data/perfumeData';
import { toggleFavorite } from '../data/store';
import type { RootState } from '../data/store';
import PerfumeItem from '../components/PerfumeItem';
import { Button } from '../components/shared';

export default function CartPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const favoriteIds = useSelector((state: RootState) => state.favorite.ids);

  const favoritePerfumes = useMemo(() => {
    return perfumeData.filter((perfume) => favoriteIds.includes(perfume.id));
  }, [favoriteIds]);

  return (
    <div className="favorites-page">
      <div className="container">
        <div className="section-title section-title-center">
          <h2>My Favorites</h2>
          <p>내가 찜한 향수 컬렉션</p>
        </div>

        {favoritePerfumes.length > 0 ? (
          <>
            <p className="favorites-count">
              총 <strong>{favoritePerfumes.length}</strong>개의 향수를 찜했습니다
            </p>
            <div className="perfume-grid">
              {favoritePerfumes.map((perfume) => (
                <PerfumeItem
                  key={perfume.id}
                  perfume={perfume}
                  isFavorite={favoriteIds.includes(perfume.id)}
                  onToggleFavorite={(id) => dispatch(toggleFavorite(id))}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">♡</div>
            <h3>아직 찜한 향수가 없습니다</h3>
            <p>마음에 드는 향수를 저장하고 나만의 향수 컬렉션을 만들어보세요.</p>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/list')}>
              컬렉션 보러가기
            </button>
          </div>
        )}

        {favoritePerfumes.length > 0 && (
          <div className="favorites-cta">
            <Button variant="secondary" onClick={() => navigate('/list')}>
              더 많은 향수 보기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
