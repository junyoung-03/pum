import { useEffect, useState } from 'react';
import { NavLink, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../data/store';
import { logout, setFavorites, setUser } from '../data/store';
import type { Perfume, User } from '../data/perfumeData';
import { api } from '../api/client';
import HomePage from '../pages/HomePage';
import ListPage from '../pages/ListPage';
import DetailPage from '../pages/DetailPage';
import CartPage from '../pages/CartPage';
import RecommendPage from '../pages/RecommendPage';
import ResultPage from '../pages/ResultPage';
import ReviewPage from '../pages/ReviewPage';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import MyPage from '../pages/MyPage';
import RecommendHistoryPage from '../pages/RecommendHistoryPage';
import MarketListPage from '../pages/MarketListPage';
import MarketDetailPage from '../pages/MarketDetailPage';
import MarketFormPage from '../pages/MarketFormPage';
import AdminPerfumePage from '../pages/AdminPerfumePage';

const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link');

export default function Content() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const favoriteCount = useSelector((state: RootState) => state.favorite.ids.length);
  const token = useSelector((state: RootState) => state.auth.token);
  const user = useSelector((state: RootState) => state.auth.user);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setMenuOpen(false);
  }, [pathname]);

  // 로그인 상태가 되면 서버에서 내 정보와 내 찜 목록을 받아옴
  useEffect(() => {
    if (!token) return;
    api<User>('/users/me')
      .then(({ data }) => dispatch(setUser(data)))
      .catch(() => undefined);
    api<Perfume[]>('/favorites')
      .then(({ data }) => dispatch(setFavorites(data.map((p) => p.id))))
      .catch(() => undefined);
  }, [token, dispatch]);

  const handleLogout = async () => {
    try {
      await api('/users/logout', 'POST');
    } catch {
      // 이미 만료된 토큰이어도 화면에서는 로그아웃 처리
    }
    dispatch(logout());
    navigate('/');
  };

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <NavLink to="/" className="logo">
            SCENTIQUE
          </NavLink>
          <nav className={`nav ${menuOpen ? 'nav-open' : ''}`}>
            <NavLink to="/" className={navClass} end>
              HOME
            </NavLink>
            <NavLink to="/recommend" className={navClass}>
              RECOMMEND
            </NavLink>
            <NavLink to="/list" className={navClass}>
              COLLECTION
            </NavLink>
            <NavLink to="/review" className={navClass}>
              REVIEW
            </NavLink>
            <NavLink to="/market" className={navClass}>
              MARKET
            </NavLink>
            <NavLink to="/cart" className={navClass}>
              FAVORITES
              {favoriteCount > 0 && <span className="favorite-count">{favoriteCount}</span>}
            </NavLink>

            <span className="nav-divider" />

            {user ? (
              <>
                {user.role === 'admin' && (
                  <NavLink to="/admin/perfumes" className={navClass}>
                    ADMIN
                  </NavLink>
                )}
                <NavLink to="/mypage" className={navClass}>
                  {user.nickname}님
                </NavLink>
                <button type="button" className="nav-link nav-button" onClick={handleLogout}>
                  LOGOUT
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navClass}>
                  LOGIN
                </NavLink>
                <NavLink to="/signup" className={navClass}>
                  JOIN
                </NavLink>
              </>
            )}
          </nav>
          <button
            className="mobile-menu-btn"
            aria-label="메뉴"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/recommend" element={<RecommendPage />} />
          <Route path="/recommend/history" element={<RecommendHistoryPage />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/list" element={<ListPage />} />
          <Route path="/detail/:id" element={<DetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/market" element={<MarketListPage />} />
          <Route path="/market/new" element={<MarketFormPage />} />
          <Route path="/market/:id" element={<MarketDetailPage />} />
          <Route path="/market/:id/edit" element={<MarketFormPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/admin/perfumes" element={<AdminPerfumePage />} />
        </Routes>
      </main>
    </>
  );
}
