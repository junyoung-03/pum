// 찜 버튼 공통 동작
// - 로그인 안 했으면 로그인 페이지로 이동
// - 찜 추가: POST /api/favorites/:perfumeId, 찜 해제: DELETE /api/favorites/:perfumeId
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import { addFavorite, removeFavorite } from './store';
import type { RootState } from './store';

export default function useFavorite() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const favoriteIds = useSelector((state: RootState) => state.favorite.ids);
  const isLoggedIn = useSelector((state: RootState) => Boolean(state.auth.token));

  const toggleFavorite = async (perfumeId: string) => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: location.pathname, message: '찜하려면 로그인이 필요합니다.' } });
      return false;
    }
    const isFavorite = favoriteIds.includes(perfumeId);
    try {
      if (isFavorite) {
        await api(`/favorites/${perfumeId}`, 'DELETE');
        dispatch(removeFavorite(perfumeId));
      } else {
        await api(`/favorites/${perfumeId}`, 'POST');
        dispatch(addFavorite(perfumeId));
      }
      return true;
    } catch (err) {
      alert(errorMessage(err));
      return false;
    }
  };

  return { favoriteIds, toggleFavorite };
}
