import { useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { perfumeData, Perfume } from '../data/perfumeData';
import { toggleFavorite } from '../data/store';
import type { RootState } from '../data/store';
import {
  Badge,
  Button,
  SectionTitle,
  EmptyState,
  PerfumeImage,
  NoteList
} from '../components/shared';

function getSimilarPerfumes(currentPerfume: Perfume, limit = 3) {
  return perfumeData
    .filter((p) => p.id !== currentPerfume.id)
    .map((p) => {
      let similarity = 0;
      if (p.category === currentPerfume.category) similarity += 3;
      const moodOverlap = p.mood.filter((m) => currentPerfume.mood.includes(m)).length;
      similarity += moodOverlap;
      const seasonOverlap = p.season.filter((s) => currentPerfume.season.includes(s)).length;
      similarity += seasonOverlap * 0.5;
      return { perfume: p, similarity };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map((item) => item.perfume);
}

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const favoriteIds = useSelector((state: RootState) => state.favorite.ids);

  const perfume = useMemo(() => {
    const fromState = (location.state as { perfume?: Perfume } | null)?.perfume;
    if (fromState) return fromState;
    return perfumeData.find((p) => p.id === id);
  }, [id, location.state]);

  const similarPerfumes = useMemo(() => {
    if (!perfume) return [];
    return getSimilarPerfumes(perfume, 3);
  }, [perfume]);

  if (!perfume) {
    return (
      <div className="detail-page">
        <div className="container">
          <EmptyState
            icon="?"
            title="향수를 찾을 수 없습니다"
            description="요청하신 향수 정보가 존재하지 않습니다."
            actionLabel="컬렉션으로 돌아가기"
            onAction={() => navigate('/list')}
          />
        </div>
      </div>
    );
  }

  const isFavorite = favoriteIds.includes(perfume.id);

  return (
    <div className="detail-page">
      <div className="container">
        <div className="detail-content">
          <div className="detail-image">
            <PerfumeImage
              perfume={perfume}
              className="detail-image-placeholder"
              size="large"
            />
          </div>

          <div className="detail-info-wrapper">
            <div className="perfume-detail-info">
              <div className="detail-header">
                <p className="detail-brand">{perfume.brand}</p>
                <h1 className="detail-name">{perfume.name}</h1>
                <div className="detail-badges">
                  <Badge variant="category">{perfume.noteFamily}</Badge>
                  <Badge>{perfume.price}</Badge>
                  {perfume.featured && <Badge variant="mood">Best Collection</Badge>}
                </div>
              </div>

              <p className="detail-highlight">{perfume.highlight}</p>
              <p className="detail-description">{perfume.description}</p>

              <NoteList
                topNote={perfume.topNote}
                middleNote={perfume.middleNote}
                baseNote={perfume.baseNote}
              />

              <div className="detail-meta">
                <div className="meta-item">
                  <h4>향 계열</h4>
                  <p>{perfume.noteFamily}</p>
                </div>
                <div className="meta-item">
                  <h4>무드</h4>
                  <p>{perfume.moodTags.join(', ')}</p>
                </div>
                <div className="meta-item">
                  <h4>추천 계절</h4>
                  <p>{perfume.season.join(', ')}</p>
                </div>
                <div className="meta-item">
                  <h4>추천 상황</h4>
                  <p>{perfume.purpose.join(', ')}</p>
                </div>
              </div>
            </div>

            <div className="detail-actions">
              <Button
                variant={isFavorite ? 'primary' : 'ghost'}
                onClick={() => dispatch(toggleFavorite(perfume.id))}
              >
                {isFavorite ? '♥ 찜 해제' : '♡ 찜하기'}
              </Button>
              <Link to="/list">
                <Button variant="secondary">컬렉션으로 돌아가기</Button>
              </Link>
            </div>
          </div>
        </div>

        {similarPerfumes.length > 0 && (
          <section className="similar-section">
            <SectionTitle
              title="비슷한 향수"
              subtitle="이 향수와 비슷한 느낌의 향수들"
              align="left"
            />
            <div className="similar-grid">
              {similarPerfumes.map((similar) => (
                <Link
                  key={similar.id}
                  to={`/detail/${similar.id}`}
                  state={{ perfume: similar }}
                  className="similar-card"
                >
                  <PerfumeImage perfume={similar} className="similar-image" size="small" />
                  <div className="similar-info">
                    <p className="similar-brand">{similar.brand}</p>
                    <p className="similar-name">{similar.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
