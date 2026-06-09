import { NavLink, Routes, Route } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../data/store';
import HomePage from '../pages/HomePage';
import ListPage from '../pages/ListPage';
import DetailPage from '../pages/DetailPage';
import CartPage from '../pages/CartPage';
import RecommendPage from '../pages/RecommendPage';
import ResultPage from '../pages/ResultPage';
import ReviewPage from '../pages/ReviewPage';
import ScrollToTop from './ScrollToTop';

export default function Content() {
  const favoriteCount = useSelector((state: RootState) => state.favorite.ids.length);

  return (
    <>
      <ScrollToTop />
      <header className="header">
        <div className="container header-inner">
          <NavLink to="/" className="logo">
            SCENTIQUE
          </NavLink>
          <nav className="nav">
            <NavLink
              to="/"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              end
            >
              HOME
            </NavLink>
            <NavLink
              to="/recommend"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              RECOMMEND
            </NavLink>
            <NavLink
              to="/list"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              COLLECTION
            </NavLink>
            <NavLink
              to="/review"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              REVIEW
            </NavLink>
            <NavLink
              to="/cart"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              FAVORITES
              {favoriteCount > 0 && <span className="favorite-count">{favoriteCount}</span>}
            </NavLink>
          </nav>
          <button className="mobile-menu-btn" aria-label="메뉴">
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
          <Route path="/result" element={<ResultPage />} />
          <Route path="/list" element={<ListPage />} />
          <Route path="/detail/:id" element={<DetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/review" element={<ReviewPage />} />
        </Routes>
      </main>
    </>
  );
}
