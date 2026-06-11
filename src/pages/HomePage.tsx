import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { featuredPerfumes } from '../data/perfumeData';
import { toggleFavorite } from '../data/store';
import type { RootState } from '../data/store';
import { Button, PerfumeImage } from '../components/shared';

export default function HomePage() {
  const dispatch = useDispatch();
  const favoriteIds = useSelector((state: RootState) => state.favorite.ids);

  const features = [
    {
      icon: '✧',
      title: 'Mood Based Curation',
      description: '사용자의 분위기와 취향을 기반으로 향수를 추천합니다.'
    },
    {
      icon: '◇',
      title: 'Premium Collection',
      description: '검증된 프리미엄 향수 컬렉션을 제공합니다.'
    },
    {
      icon: '♡',
      title: 'Personal Favorite',
      description: '마음에 드는 향수를 저장하고 비교할 수 있습니다.'
    }
  ];

  return (
    <div className="home-page">
      <section className="hero">
        <div className="container hero-content">
          <p className="hero-brand">SCENTIQUE</p>
          <h1 className="hero-title">Find Your Signature Scent</h1>
          <p className="hero-subtitle">
            당신의 분위기를 완성하는 프리미엄 향수 큐레이션
          </p>
          <Link to="/recommend">
            <Button variant="primary" size="large">
              나에게 맞는 향수 찾기
            </Button>
          </Link>
        </div>
      </section>

      <section className="features-section">
        <div className="container">
          <div className="section-title section-title-center">
            <h2>Why SCENTIQUE</h2>
            <p>특별한 향수 경험을 위한 세 가지 약속</p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <span className="feature-icon">{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="best-section">
        <div className="container">
          <div className="section-title section-title-center">
            <h2>Best Collection</h2>
            <p>가장 사랑받는 시그니처 향수</p>
          </div>
          <div className="best-grid">
            {featuredPerfumes.map((perfume) => (
              <article key={perfume.id} className="best-card">
                <Link
                  to={`/detail/${perfume.id}`}
                  state={{ perfume }}
                  className="best-card-image"
                >
                  <PerfumeImage perfume={perfume} className="best-image-placeholder" />
                </Link>
                <div className="best-card-content">
                  <p className="best-brand">{perfume.brand}</p>
                  <h3 className="best-name">
                    <Link to={`/detail/${perfume.id}`} state={{ perfume }}>
                      {perfume.name}
                    </Link>
                  </h3>
                  <p className="best-copy">{perfume.shortCopy}</p>
                  <div className="best-card-actions">
                    <button
                      className={`favorite-btn ${favoriteIds.includes(perfume.id) ? 'active' : ''}`}
                      onClick={() => dispatch(toggleFavorite(perfume.id))}
                    >
                      {favoriteIds.includes(perfume.id) ? '♥' : '♡'}
                    </button>
                    <Link to={`/detail/${perfume.id}`} state={{ perfume }}>
                      <Button variant="ghost" size="small">
                        View More
                      </Button>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="section-cta">
            <Link to="/list">
              <Button variant="secondary">전체 컬렉션 보기</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container cta-content">
          <h2>나에게 맞는 향수를 찾고 싶다면?</h2>
          <p>4가지 질문으로 당신만의 시그니처 향수를 추천받아보세요</p>
          <Link to="/recommend">
            <Button variant="primary" size="large">
              향수 추천받기
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
