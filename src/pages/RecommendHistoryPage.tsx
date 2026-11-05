import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { api, errorMessage, formatDate } from '../api/client';
import type { RootState } from '../data/store';
import type { RecommendHistory } from '../data/perfumeData';
import { Button, PerfumeImage } from '../components/shared';
import LoginRequired from '../components/LoginRequired';

// 내 추천 기록
//   GET    /api/recommend/history       목록
//   GET    /api/recommend/history/:id   상세 (추천 이유·일치 조건)
//   DELETE /api/recommend/history/:id   삭제
export default function RecommendHistoryPage() {
  const isLoggedIn = useSelector((state: RootState) => Boolean(state.auth.token));
  const [history, setHistory] = useState<RecommendHistory[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<RecommendHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn) return;
    api<RecommendHistory[]>('/recommend/history')
      .then(({ data }) => setHistory(data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="page-section">
        <div className="container">
          <LoginRequired message="로그인하면 추천 기록을 볼 수 있어요" />
        </div>
      </div>
    );
  }

  const toggleDetail = async (id: number) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    try {
      const { data } = await api<RecommendHistory>(`/recommend/history/${id}`);
      setDetail(data);
      setOpenId(id);
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('이 추천 기록을 삭제할까요?')) return;
    try {
      await api(`/recommend/history/${id}`, 'DELETE');
      setHistory((list) => list.filter((h) => h.id !== id));
      if (openId === id) setOpenId(null);
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  return (
    <div className="page-section">
      <div className="container narrow-container">
        <div className="section-title section-title-center">
          <h2>My Recommendations</h2>
          <p>지금까지 받은 향수 추천 기록</p>
        </div>

        {error && <p className="notice notice-error">{error}</p>}

        {loading ? (
          <p className="loading-block">불러오는 중...</p>
        ) : history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✧</div>
            <h3>아직 추천 기록이 없습니다</h3>
            <p>4가지 질문에 답하고 나에게 맞는 향수를 추천받아 보세요.</p>
            <Link to="/recommend">
              <Button variant="primary">향수 추천받기</Button>
            </Link>
          </div>
        ) : (
          <div className="history-list">
            {history.map((item) => (
              <article key={item.id} className="history-card">
                <div className="history-main">
                  {item.perfume && <PerfumeImage perfume={item.perfume} className="history-image" size="small" />}
                  <div className="history-info">
                    <p className="history-date">{formatDate(item.createdAt)}</p>
                    <h3>
                      {item.perfume ? (
                        <Link to={`/detail/${item.perfume.id}`}>
                          {item.perfume.brand} {item.perfume.name}
                        </Link>
                      ) : (
                        '삭제된 향수'
                      )}
                    </h3>
                    <div className="selection-tags">
                      {Object.values(item.answers)
                        .filter(Boolean)
                        .map((v) => (
                          <span key={v}>{v}</span>
                        ))}
                    </div>
                  </div>
                  <div className="history-score">
                    <span>매칭</span>
                    <strong>{item.score}%</strong>
                  </div>
                </div>

                {openId === item.id && detail && (
                  <div className="history-detail">
                    <p>{detail.reason}</p>
                    <p className="muted-text">일치한 조건: {detail.matchedCriteria.join(', ')}</p>
                  </div>
                )}

                <div className="history-actions">
                  <button type="button" onClick={() => toggleDetail(item.id)}>
                    {openId === item.id ? '접기' : '추천 이유 보기'}
                  </button>
                  <button type="button" onClick={() => handleDelete(item.id)}>
                    삭제
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
