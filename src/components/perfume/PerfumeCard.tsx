import { Link } from 'react-router-dom';
import { Perfume } from '../../types/perfume';
import Badge from '../common/Badge';
import Button from '../common/Button';

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
        <div 
          className="perfume-image-placeholder"
          style={{ background: perfume.color }}
        >
          <div className="perfume-bottle-icon">
            <svg viewBox="0 0 60 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="20" y="0" width="20" height="15" rx="2" fill="currentColor" opacity="0.6"/>
              <rect x="22" y="15" width="16" height="5" fill="currentColor" opacity="0.4"/>
              <path d="M10 25 L50 25 L55 90 Q55 95 50 95 L10 95 Q5 95 5 90 L10 25Z" 
                    fill="currentColor" opacity="0.3"/>
              <path d="M15 35 L45 35 L48 85 Q48 88 45 88 L15 88 Q12 88 12 85 L15 35Z" 
                    fill="currentColor" opacity="0.15"/>
            </svg>
          </div>
        </div>
      </Link>
      <div className="perfume-card-content">
        <div className="perfume-card-badges">
          <Badge variant="category">{perfume.category}</Badge>
          <Badge variant="mood">{perfume.mood[0]}</Badge>
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
