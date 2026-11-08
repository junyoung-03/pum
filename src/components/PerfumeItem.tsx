import { Link } from 'react-router-dom';
import { Perfume } from '../data/perfumeData';
import { Badge, Button, PerfumeImage } from './shared';

interface PerfumeItemProps {
  perfume: Perfume;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

export default function PerfumeItem({
  perfume,
  isFavorite,
  onToggleFavorite
}: PerfumeItemProps) {
  return (
    <article className="perfume-card">
      <Link
        to={`/detail/${perfume.id}`}
       
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
          <Link to={`/detail/${perfume.id}`}>
            {perfume.name}
          </Link>
        </h3>
        <p className="perfume-copy">{perfume.shortCopy}</p>
        <div className="perfume-card-actions">
          <Button
            variant="ghost"
            size="small"
            onClick={() => onToggleFavorite(perfume.id)}
            className={isFavorite ? 'favorite-active' : ''}
          >
            {isFavorite ? '♥ 찜 해제' : '♡ 찜하기'}
          </Button>
          <Link to={`/detail/${perfume.id}`} className="btn btn-secondary btn-small">
            상세보기
          </Link>
        </div>
      </div>
    </article>
  );
}
