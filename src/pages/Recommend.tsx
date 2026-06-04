import { useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecommendAnswers } from '../types/perfume';
import { questionData } from '../data/questionData';
import ProgressBar from '../components/recommend/ProgressBar';
import QuestionCard from '../components/recommend/QuestionCard';
import OptionCard from '../components/recommend/OptionCard';
import Button from '../components/common/Button';

interface State {
  step: number;
  answers: RecommendAnswers;
}

type Action =
  | { type: 'SET_ANSWER'; key: keyof RecommendAnswers; value: string }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'RESET' };

const initialState: State = {
  step: 1,
  answers: {
    mood: '',
    season: '',
    category: '',
    purpose: ''
  }
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_ANSWER':
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.key]: action.value
        }
      };
    case 'NEXT_STEP':
      return {
        ...state,
        step: Math.min(state.step + 1, questionData.length)
      };
    case 'PREV_STEP':
      return {
        ...state,
        step: Math.max(state.step - 1, 1)
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export default function Recommend() {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [error, setError] = useState('');

  const currentQuestion = questionData.find((q) => q.id === state.step);
  const isLastStep = state.step === questionData.length;
  const currentAnswer = currentQuestion 
    ? state.answers[currentQuestion.key] 
    : '';

  const handleOptionSelect = (value: string) => {
    if (currentQuestion) {
      dispatch({ 
        type: 'SET_ANSWER', 
        key: currentQuestion.key, 
        value: value as never 
      });
      setError('');
    }
  };

  const handleNext = () => {
    if (!currentAnswer) {
      setError('옵션을 선택해 주세요.');
      return;
    }
    dispatch({ type: 'NEXT_STEP' });
    setError('');
  };

  const handlePrev = () => {
    dispatch({ type: 'PREV_STEP' });
    setError('');
  };

  const handleSubmit = () => {
    if (!currentAnswer) {
      setError('옵션을 선택해 주세요.');
      return;
    }
    sessionStorage.setItem('scentique-answers', JSON.stringify(state.answers));
    navigate('/result');
  };

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="recommend-page">
      <div className="container recommend-container">
        <div className="recommend-header">
          <h1>향수 추천</h1>
          <p>4가지 질문으로 당신에게 어울리는 향수를 찾아드려요</p>
        </div>

        <ProgressBar current={state.step} total={questionData.length} />

        <div className="recommend-content">
          <QuestionCard question={currentQuestion} />

          <div className="options-grid">
            {currentQuestion.options.map((option) => (
              <OptionCard
                key={option}
                option={option}
                isSelected={currentAnswer === option}
                onClick={() => handleOptionSelect(option)}
              />
            ))}
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="recommend-actions">
            {state.step > 1 && (
              <Button variant="ghost" onClick={handlePrev}>
                이전
              </Button>
            )}
            {isLastStep ? (
              <Button variant="primary" onClick={handleSubmit}>
                결과 보기
              </Button>
            ) : (
              <Button variant="primary" onClick={handleNext}>
                다음
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
