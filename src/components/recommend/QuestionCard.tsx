import { RecommendQuestion } from '../../types/perfume';

interface QuestionCardProps {
  question: RecommendQuestion;
}

export default function QuestionCard({ question }: QuestionCardProps) {
  return (
    <div className="question-card">
      <h2 className="question-title">{question.title}</h2>
      <p className="question-subtitle">{question.subtitle}</p>
    </div>
  );
}
