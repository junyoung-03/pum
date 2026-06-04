import { Perfume } from '../../types/perfume';
import PerfumeCard from './PerfumeCard';

interface PerfumeGridProps {
  perfumes: Perfume[];
  favoriteIds: string[];
  onToggleFavorite: (id: string) => void;
}

export default function PerfumeGrid({ 
  perfumes, 
  favoriteIds, 
  onToggleFavorite 
}: PerfumeGridProps) {
  return (
    <div className="perfume-grid">
      {perfumes.map((perfume) => (
        <PerfumeCard
          key={perfume.id}
          perfume={perfume}
          isFavorite={favoriteIds.includes(perfume.id)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}
