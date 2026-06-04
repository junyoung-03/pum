import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import SectionTitle from '../components/common/SectionTitle';
import { perfumeData } from '../data/perfumeData';
import { useFavorites } from '../hooks/useFavorites';

export default function Home() {
  const { toggleFavorite, isFavorite } = useFavorites();
  const bestPerfumes = perfumeData.slice(0, 3);

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
          <SectionTitle 
            title="Why SCENTIQUE" 
            subtitle="특별한 향수 경험을 위한 세 가지 약속"
          />
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
          <SectionTitle 
            title="Best Collection" 
            subtitle="가장 사랑받는 시그니처 향수"
          />
          <div className="best-grid">
            {bestPerfumes.map((perfume) => (
              <article key={perfume.id} className="best-card">
                <Link to={`/perfume/${perfume.id}`} className="best-card-image">
                  <div 
                    className="best-image-placeholder"
                    style={{ background: perfume.color }}
                  >
                    <div className="perfume-bottle-icon">
                      <svg viewBox="0 0 60 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="20" y="0" width="20" height="15" rx="2" fill="currentColor" opacity="0.6"/>
                        <rect x="22" y="15" width="16" height="5" fill="currentColor" opacity="0.4"/>
                        <path d="M10 25 L50 25 L55 90 Q55 95 50 95 L10 95 Q5 95 5 90 L10 25Z" 
                              fill="currentColor" opacity="0.3"/>
                      </svg>
                    </div>
                  </div>
                </Link>
                <div className="best-card-content">
                  <p className="best-brand">{perfume.brand}</p>
                  <h3 className="best-name">
                    <Link to={`/perfume/${perfume.id}`}>{perfume.name}</Link>
                  </h3>
                  <p className="best-copy">{perfume.shortCopy}</p>
                  <div className="best-card-actions">
                    <button
                      className={`favorite-btn ${isFavorite(perfume.id) ? 'active' : ''}`}
                      onClick={() => toggleFavorite(perfume.id)}
                    >
                      {isFavorite(perfume.id) ? '♥' : '♡'}
                    </button>
                    <Link to={`/perfume/${perfume.id}`}>
                      <Button variant="ghost" size="small">View More</Button>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="section-cta">
            <Link to="/collection">
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
