import { Perfume } from '../../types/perfume';
import Badge from '../common/Badge';
import NoteList from './NoteList';

interface PerfumeDetailInfoProps {
  perfume: Perfume;
}

export default function PerfumeDetailInfo({ perfume }: PerfumeDetailInfoProps) {
  return (
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
  );
}
