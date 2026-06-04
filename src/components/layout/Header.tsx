import { NavLink } from 'react-router-dom';
import { useFavorites } from '../../hooks/useFavorites';

export default function Header() {
  const { favoriteCount } = useFavorites();

  return (
    <header className="header">
      <div className="container header-inner">
        <NavLink to="/" className="logo">
          SCENTIQUE
        </NavLink>
        <nav className="nav">
          <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} end>
            HOME
          </NavLink>
          <NavLink to="/recommend" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            RECOMMEND
          </NavLink>
          <NavLink to="/collection" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            COLLECTION
          </NavLink>
          <NavLink to="/review" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            REVIEW
          </NavLink>
          <NavLink to="/favorites" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
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
  );
}
