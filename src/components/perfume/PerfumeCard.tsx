import { Link } from 'react-router-dom';
import { Perfume } from '../../types/perfume';
import Badge from '../common/Badge';
import Button from '../common/Button';
import PerfumeImage from './PerfumeImage';

interface PerfumeCardProps {
  perfume: Perfume;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

export default function PerfumeCard({
  perfume,
  isFavorite,
  onToggleFavorite
}: PerfumeCardProps) {
  return (
    <article className="perfume-card">
      <Link to={`/perfume/${perfume.id}`} className="perfume-card-image">
        <PerfumeImage perfume={perfume} className="perfume-image-placeholder" />
      </Link>
      <div className="perfume-card-content">
        <div className="perfume-card-badges">
          <Badge variant="category">{perfume.noteFamily}</Badge>
          {perfume.featured && <Badge variant="mood">Best</Badge>}
        </div>
        <p className="perfume-brand">{perfume.brand}</p>
        <h3 className="perfume-name">
          <Link to={`/perfume/${perfume.id}`}>{perfume.name}</Link>
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
          <Link to={`/perfume/${perfume.id}`}>
            <Button variant="secondary" size="small">상세보기</Button>
          </Link>
        </div>
      </div>
    </article>
  );
}
