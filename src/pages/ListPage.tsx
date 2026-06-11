import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { perfumeData, Category, Mood } from '../data/perfumeData';
import { toggleFavorite } from '../data/store';
import type { RootState } from '../data/store';
import PerfumeItem from '../components/PerfumeItem';

const categories: (Category | 'All')[] = ['All', 'Floral', 'Woody', 'Musk', 'Citrus', 'Amber'];
const moods: (Mood | '전체')[] = ['전체', '고급스러운', '상큼한', '차분한', '로맨틱한', '세련된', '우아한'];

export default function ListPage() {
  const dispatch = useDispatch();
  const favoriteIds = useSelector((state: RootState) => state.favorite.ids);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [selectedMood, setSelectedMood] = useState<Mood | '전체'>('전체');

  const filteredPerfumes = perfumeData.filter((perfume) => {
    const matchesSearch =
      perfume.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      perfume.brand.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' || perfume.category === selectedCategory;

    const matchesMood =
      selectedMood === '전체' || perfume.mood.includes(selectedMood);

    return matchesSearch && matchesCategory && matchesMood;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedMood('전체');
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
        </div>

        <div className="collection-results">
          <p className="results-count">
            총 <strong>{filteredPerfumes.length}</strong>개의 향수
          </p>

          {filteredPerfumes.length > 0 ? (
            <div className="perfume-grid">
              {filteredPerfumes.map((perfume) => (
                <PerfumeItem
                  key={perfume.id}
                  perfume={perfume}
                  isFavorite={favoriteIds.includes(perfume.id)}
                  onToggleFavorite={(id) => dispatch(toggleFavorite(id))}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h3>검색 결과가 없습니다</h3>
              <p>다른 검색어나 필터를 사용해 보세요.</p>
              <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                필터 초기화
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
