import { Link } from 'react-router-dom';
import { Perfume, RecommendAnswers } from '../../types/perfume';
import Badge from '../common/Badge';
import Button from '../common/Button';
import NoteList from '../perfume/NoteList';

interface ResultCardProps {
  perfume: Perfume;
  score: number;
  reason: string;
  answers: RecommendAnswers;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

export default function ResultCard({
  perfume,
  score,
  reason,
  answers,
  isFavorite,
  onToggleFavorite
}: ResultCardProps) {
  return (
    <div className="result-card">
      <div className="result-header">
        <h2>당신을 위한 향수</h2>
        <p className="result-subtitle">Your Perfect Match</p>
      </div>

      <div className="result-content">
        <div className="result-perfume-image">
          <div 
            className="result-image-placeholder"
            style={{ background: perfume.color }}
          >
            <div className="perfume-bottle-icon large">
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
        </div>

        <div className="result-perfume-info">
          <div className="result-score">
            <span className="score-label">매칭 점수</span>
            <span className="score-value">{score}%</span>
          </div>

          <p className="result-brand">{perfume.brand}</p>
          <h3 className="result-name">{perfume.name}</h3>
          
          <div className="result-badges">
            <Badge variant="category">{perfume.category}</Badge>
            {perfume.mood.slice(0, 2).map((m) => (
              <Badge key={m} variant="mood">{m}</Badge>
            ))}
          </div>

          <p className="result-reason">{reason}</p>

          <div className="result-selection">
            <h4>선택한 조건</h4>
            <div className="selection-tags">
              {answers.mood && <span>{answers.mood}</span>}
              {answers.season && <span>{answers.season}</span>}
              {answers.category && <span>{answers.category}</span>}
              {answers.purpose && <span>{answers.purpose}</span>}
            </div>
          </div>

          <NoteList
            topNote={perfume.topNote}
            middleNote={perfume.middleNote}
            baseNote={perfume.baseNote}
          />

          <div className="result-actions">
            <Button
              variant="ghost"
              onClick={() => onToggleFavorite(perfume.id)}
              className={isFavorite ? 'favorite-active' : ''}
            >
              {isFavorite ? '♥ 찜 해제' : '♡ 찜하기'}
            </Button>
            <Link to={`/perfume/${perfume.id}`}>
              <Button variant="secondary">상세보기</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
