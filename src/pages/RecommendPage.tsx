import { useEffect, useReducer, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { api, errorMessage } from '../api/client';
import { RecommendAnswers, RecommendQuestion, RecommendResult } from '../data/perfumeData';
import { setAnswers, setResult } from '../data/store';
import type { RootState } from '../data/store';
import { Button } from '../components/shared';

interface State {
  step: number;
  answers: RecommendAnswers;
}

type Action =
  | { type: 'SET_ANSWER'; key: keyof RecommendAnswers; value: string }
  | { type: 'NEXT_STEP'; total: number }
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
        step: Math.min(state.step + 1, action.total)
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

// 추천 설문: GET /api/recommend/questions → 결과 보기: POST /api/recommend
export default function RecommendPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isLoggedIn = useSelector((state: RootState) => Boolean(state.auth.token));
  const [state, reducerDispatch] = useReducer(reducer, initialState);
  const [error, setError] = useState('');
  const [questionData, setQuestionData] = useState<RecommendQuestion[]>([]);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api<RecommendQuestion[]>('/recommend/questions')
      .then(({ data }) => setQuestionData(data))
      .catch((err) => setLoadError(errorMessage(err)));
  }, []);

  const currentQuestion = questionData.find((q) => q.id === state.step);
  const isLastStep = state.step === questionData.length;
  const currentAnswer = currentQuestion ? state.answers[currentQuestion.key] : '';
  const percentage = questionData.length > 0 ? (state.step / questionData.length) * 100 : 0;

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
    reducerDispatch({ type: 'NEXT_STEP', total: questionData.length });
    setError('');
  };

  const handlePrev = () => {
    reducerDispatch({ type: 'PREV_STEP' });
    setError('');
  };

  // 서버가 점수를 계산해서 추천 결과를 돌려줌 (로그인 상태면 내 추천 기록에도 저장)
  const handleSubmit = async () => {
    if (!currentAnswer) {
      setError('옵션을 선택해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api<RecommendResult>('/recommend', 'POST', state.answers);
      dispatch(setAnswers(state.answers));
      dispatch(setResult(data));
      navigate('/result');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentQuestion) {
    return (
      <div className="recommend-page">
        <div className="container recommend-container">
          <div className="recommend-header">
            <h1>향수 추천</h1>
            <p>4가지 질문으로 당신에게 어울리는 향수를 찾아드려요</p>
          </div>
          {loadError ? <p className="notice notice-error">{loadError}</p> : <p className="loading-block">질문을 불러오는 중...</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="recommend-page">
      <div className="container recommend-container">
        <div className="recommend-header">
          <h1>향수 추천</h1>
          <p>4가지 질문으로 당신에게 어울리는 향수를 찾아드려요</p>
          {isLoggedIn && (
            <Link to="/recommend/history" className="text-link">
              내 추천 기록 보기 →
            </Link>
          )}
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
              <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? '분석 중...' : '결과 보기'}
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
