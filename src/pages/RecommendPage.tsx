import { useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { RecommendAnswers } from '../data/perfumeData';
import { questionData } from '../data/questionData';
import { setAnswers } from '../data/store';
import { Button } from '../components/shared';

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

export default function RecommendPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [state, reducerDispatch] = useReducer(reducer, initialState);
  const [error, setError] = useState('');

  const currentQuestion = questionData.find((q) => q.id === state.step);
  const isLastStep = state.step === questionData.length;
  const currentAnswer = currentQuestion ? state.answers[currentQuestion.key] : '';
  const percentage = (state.step / questionData.length) * 100;

  const handleOptionSelect = (value: string) => {
    if (currentQuestion) {
      reducerDispatch({
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
    reducerDispatch({ type: 'NEXT_STEP' });
    setError('');
  };

  const handlePrev = () => {
    reducerDispatch({ type: 'PREV_STEP' });
    setError('');
  };

  const handleSubmit = () => {
    if (!currentAnswer) {
      setError('옵션을 선택해 주세요.');
      return;
    }
    dispatch(setAnswers(state.answers));
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

        <div className="progress-bar-container">
          <div className="progress-bar-header">
            <span className="progress-step">
              STEP {state.step} / {questionData.length}
            </span>
            <span className="progress-percentage">{Math.round(percentage)}%</span>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${percentage}%` }} />
          </div>
        </div>

        <div className="recommend-content">
          <div className="question-card">
            <h2>{currentQuestion.title}</h2>
            <p>{currentQuestion.subtitle}</p>
          </div>

          <div className="options-grid">
            {currentQuestion.options.map((option) => (
              <button
                key={option}
                type="button"
                className={`option-card ${currentAnswer === option ? 'option-card-selected' : ''}`}
                onClick={() => handleOptionSelect(option)}
              >
                <span>{option}</span>
                {currentAnswer === option && <span className="option-check">✓</span>}
              </button>
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
