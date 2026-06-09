import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Perfume } from '../data/perfumeData';
import { toggleFavorite } from '../data/store';
import type { RootState } from '../data/store';
import { Badge, Button, PerfumeImage } from './shared';

export default function PerfumeItem({ perfume }: { perfume: Perfume }) {
  const dispatch = useDispatch();
  const favoriteIds = useSelector((state: RootState) => state.favorite.ids);
  const isFavorite = favoriteIds.includes(perfume.id);

  return (
    <article className="perfume-card">
      <Link
        to={`/detail/${perfume.id}`}
        state={{ perfume }}
        className="perfume-card-image"
      >
        <PerfumeImage perfume={perfume} className="perfume-image-placeholder" />
      </Link>
      <div className="perfume-card-content">
        <div className="perfume-card-badges">
          <Badge variant="category">{perfume.noteFamily}</Badge>
          {perfume.featured && <Badge variant="mood">Best</Badge>}
        </div>
        <p className="perfume-brand">{perfume.brand}</p>
        <h3 className="perfume-name">
          <Link to={`/detail/${perfume.id}`} state={{ perfume }}>
            {perfume.name}
          </Link>
        </h3>
        <p className="perfume-copy">{perfume.shortCopy}</p>
        <div className="perfume-card-actions">
          <Button
            variant="ghost"
            size="small"
            onClick={() => dispatch(toggleFavorite(perfume.id))}
            className={isFavorite ? 'favorite-active' : ''}
          >
            {isFavorite ? '♥ 찜 해제' : '♡ 찜하기'}
          </Button>
          <Link to={`/detail/${perfume.id}`} state={{ perfume }}>
            <Button variant="secondary" size="small">
              상세보기
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}
