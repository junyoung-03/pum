import { useEffect, useState } from 'react';
import { api, errorMessage, toQuery } from '../api/client';
import { CATEGORIES, MOODS, SEASONS, Category, Mood, Perfume, Season } from '../data/perfumeData';
import useFavorite from '../data/useFavorite';
import PerfumeItem from '../components/PerfumeItem';

const categories: (Category | 'All')[] = ['All', ...CATEGORIES];
const moods: (Mood | '전체')[] = ['전체', ...MOODS];
const seasons: (Season | '전체')[] = ['전체', ...SEASONS];

// 컬렉션: GET /api/perfumes?q=&category=&mood=&season= (검색·필터는 서버에서 처리)
export default function ListPage() {
  const { favoriteIds, toggleFavorite } = useFavorite();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [selectedMood, setSelectedMood] = useState<Mood | '전체'>('전체');
  const [selectedSeason, setSelectedSeason] = useState<Season | '전체'>('전체');

  const [perfumes, setPerfumes] = useState<Perfume[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // 검색어 입력 중에는 0.3초 기다렸다가 요청
    const timer = setTimeout(() => {
      setLoading(true);
      const query = toQuery({
        q: searchQuery.trim(),
        category: selectedCategory === 'All' ? '' : selectedCategory,
        mood: selectedMood === '전체' ? '' : selectedMood,
        season: selectedSeason === '전체' ? '' : selectedSeason,
        limit: 50
      });
      api<Perfume[]>(`/perfumes${query}`)
        .then(({ data, pagination }) => {
          setPerfumes(data);
          setTotal(pagination?.total ?? data.length);
          setError('');
        })
        .catch((err) => setError(errorMessage(err)))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, selectedMood, selectedSeason]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedMood('전체');
    setSelectedSeason('전체');
  };

  return (
    <div className="collection-page">
      <div className="container">
        <div className="section-title section-title-center">
          <h2>Collection</h2>
          <p>SCENTIQUE가 엄선한 프리미엄 향수 컬렉션</p>
        </div>

        <div className="collection-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="향수명 또는 브랜드 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>

          <div className="filter-group">
            <label>향 계열</label>
            <div className="filter-buttons">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>무드</label>
            <div className="filter-buttons">
              {moods.map((mood) => (
                <button
                  key={mood}
                  className={`filter-btn ${selectedMood === mood ? 'active' : ''}`}
                  onClick={() => setSelectedMood(mood)}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>계절</label>
            <div className="filter-buttons">
              {seasons.map((season) => (
                <button
                  key={season}
                  className={`filter-btn ${selectedSeason === season ? 'active' : ''}`}
                  onClick={() => setSelectedSeason(season)}
                >
                  {season}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="collection-results">
          {error && <p className="notice notice-error">{error}</p>}

          <p className="results-count">
            총 <strong>{total}</strong>개의 향수 {loading && <span className="loading-text">불러오는 중...</span>}
          </p>

          {perfumes.length > 0 ? (
            <div className="perfume-grid">
              {perfumes.map((perfume) => (
                <PerfumeItem
                  key={perfume.id}
                  perfume={perfume}
                  isFavorite={favoriteIds.includes(perfume.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          ) : (
            !loading &&
            !error && (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <h3>검색 결과가 없습니다</h3>
                <p>다른 검색어나 필터를 사용해 보세요.</p>
                <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                  필터 초기화
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
