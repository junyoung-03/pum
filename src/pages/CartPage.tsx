import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { api, errorMessage } from '../api/client';
import { setFavorites } from '../data/store';
import type { RootState } from '../data/store';
import type { Perfume } from '../data/perfumeData';
import useFavorite from '../data/useFavorite';
import PerfumeItem from '../components/PerfumeItem';
import LoginRequired from '../components/LoginRequired';
import { Button } from '../components/shared';

// 내 찜 목록: GET /api/favorites, 찜 해제: DELETE /api/favorites/:id, 전체 비우기: DELETE /api/favorites
export default function CartPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isLoggedIn = useSelector((state: RootState) => Boolean(state.auth.token));
  const { favoriteIds, toggleFavorite } = useFavorite();

  const [favoritePerfumes, setFavoritePerfumes] = useState<Perfume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn) return;
    api<Perfume[]>('/favorites')
      .then(({ data }) => {
        setFavoritePerfumes(data);
        dispatch(setFavorites(data.map((p) => p.id)));
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [isLoggedIn, dispatch]);

  if (!isLoggedIn) {
    return (
      <div className="favorites-page">
        <div className="container">
          <div className="section-title section-title-center">
            <h2>My Favorites</h2>
            <p>내가 찜한 향수 컬렉션</p>
          </div>
          <LoginRequired message="로그인하면 찜한 향수를 볼 수 있어요" />
        </div>
      </div>
    );
  }

  const handleToggle = async (id: string) => {
    const done = await toggleFavorite(id);
    if (done) setFavoritePerfumes((list) => list.filter((p) => p.id !== id));
  };

  const handleClear = async () => {
    if (!window.confirm('찜한 향수를 모두 삭제할까요?')) return;
    try {
      await api('/favorites', 'DELETE');
      setFavoritePerfumes([]);
      dispatch(setFavorites([]));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="favorites-page">
      <div className="container">
        <div className="section-title section-title-center">
          <h2>My Favorites</h2>
          <p>내가 찜한 향수 컬렉션</p>
        </div>

        {error && <p className="notice notice-error">{error}</p>}

        {loading ? (
          <p className="loading-block">불러오는 중...</p>
        ) : favoritePerfumes.length > 0 ? (
          <>
            <div className="favorites-toolbar">
              <p className="favorites-count">
                총 <strong>{favoritePerfumes.length}</strong>개의 향수를 찜했습니다
              </p>
              <Button variant="ghost" size="small" onClick={handleClear}>
                전체 비우기
              </Button>
            </div>
            <div className="perfume-grid">
              {favoritePerfumes.map((perfume) => (
                <PerfumeItem
                  key={perfume.id}
                  perfume={perfume}
                  isFavorite={favoriteIds.includes(perfume.id)}
                  onToggleFavorite={handleToggle}
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
