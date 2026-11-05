import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { FavoriteRank, FeaturedPerfume } from '../data/perfumeData';
import useFavorite from '../data/useFavorite';
import { Button, PerfumeImage } from '../components/shared';

export default function HomePage() {
  const { favoriteIds, toggleFavorite } = useFavorite();
  const [featuredPerfumes, setFeaturedPerfumes] = useState<FeaturedPerfume[]>([]);
  const [ranking, setRanking] = useState<FavoriteRank[]>([]);
  const [error, setError] = useState('');

  // 대표 향수: GET /api/perfumes/featured
  useEffect(() => {
    api<FeaturedPerfume[]>('/perfumes/featured')
      .then(({ data }) => setFeaturedPerfumes(data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  // 인기 찜 순위: GET /api/favorites/ranking (찜을 누르면 다시 불러옴)
  useEffect(() => {
    api<FavoriteRank[]>('/favorites/ranking?limit=5')
      .then(({ data }) => setRanking(data))
      .catch(() => undefined);
  }, [favoriteIds]);

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
          {error && <p className="notice notice-error">{error}</p>}
          <div className="best-grid">
            {featuredPerfumes.map((perfume) => (
              <article key={perfume.id} className="best-card">
                <Link to={`/detail/${perfume.id}`} className="best-card-image">
                  <PerfumeImage perfume={perfume} className="best-image-placeholder" />
                </Link>
                <div className="best-card-content">
                  <p className="best-brand">{perfume.brand}</p>
                  <h3 className="best-name">
                    <Link to={`/detail/${perfume.id}`}>
                      {perfume.name}
                    </Link>
                  </h3>
                  <p className="best-copy">{perfume.shortCopy}</p>
                  <div className="best-card-actions">
                    <button
                      className={`favorite-btn ${favoriteIds.includes(perfume.id) ? 'active' : ''}`}
                      onClick={() => toggleFavorite(perfume.id)}
                    >
                      {favoriteIds.includes(perfume.id) ? '♥' : '♡'}
                    </button>
                    <Link to={`/detail/${perfume.id}`}>
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

      {ranking.length > 0 && (
        <section className="ranking-section">
          <div className="container">
            <div className="section-title section-title-center">
              <h2>Most Loved</h2>
              <p>회원들이 가장 많이 찜한 향수 TOP {ranking.length}</p>
            </div>
            <ol className="ranking-list">
              {ranking.map((item) => (
                <li key={item.id}>
                  <Link to={`/detail/${item.id}`} className="ranking-item">
                    <span className="ranking-number">{item.rank}</span>
                    <PerfumeImage perfume={item} className="ranking-image" size="small" />
                    <span className="ranking-info">
                      <span className="ranking-brand">{item.brand}</span>
                      <span className="ranking-name">{item.name}</span>
                    </span>
                    <span className="ranking-count">♥ {item.favoriteCount}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

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
