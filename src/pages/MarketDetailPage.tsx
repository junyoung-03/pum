import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { api, errorMessage, formatDate, formatPrice } from '../api/client';
import type { RootState } from '../data/store';
import { MARKET_STATUS, MarketPost, MarketStatus, Perfume } from '../data/perfumeData';
import { Badge, Button, PerfumeImage } from '../components/shared';
import { statusClass } from './MarketListPage';

// 판매글 상세
//   GET    /api/market/:id          상세
//   PATCH  /api/market/:id/status   거래 상태 변경 (본인)
//   DELETE /api/market/:id          삭제 (본인)
export default function MarketDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  const [post, setPost] = useState<MarketPost | null>(null);
  const [perfume, setPerfume] = useState<Perfume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api<MarketPost>(`/market/${id}`)
      .then(({ data }) => {
        setPost(data);
        if (data.perfumeId) {
          api<Perfume>(`/perfumes/${data.perfumeId}`)
            .then((res) => setPerfume(res.data))
            .catch(() => setPerfume(null));
        }
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="page-section">
        <div className="container">
          <p className="loading-block">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="page-section">
        <div className="container">
          <div className="empty-state">
            <div className="empty-state-icon">?</div>
            <h3>판매글을 찾을 수 없습니다</h3>
            <p>{error || '삭제되었거나 없는 판매글입니다.'}</p>
            <button type="button" className="btn btn-secondary btn-medium" onClick={() => navigate('/market')}>
              목록으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === post.seller.id;

  const changeStatus = async (status: MarketStatus) => {
    try {
      const { data } = await api<MarketPost>(`/market/${post.id}/status`, 'PATCH', { status });
      setPost(data);
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('이 판매글을 삭제할까요?')) return;
    try {
      await api(`/market/${post.id}`, 'DELETE');
      navigate('/market', { replace: true });
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  return (
    <div className="page-section">
      <div className="container">
        <Link to="/market" className="text-link">
          ← 목록으로
        </Link>

        <div className="market-detail">
          <div className="market-detail-image">
            {perfume ? (
              <PerfumeImage perfume={perfume} className="detail-image-placeholder" size="large" />
            ) : (
              <div className="market-no-image">
                <span>{post.brand}</span>
              </div>
            )}
          </div>

          <div className="market-detail-info">
            <div className="market-card-top">
              <span className={`status-badge ${statusClass(post.status)}`}>{post.status}</span>
              <span className="market-date">등록 {formatDate(post.createdAt)}</span>
            </div>
            <p className="detail-brand">{post.brand}</p>
            <h1 className="market-detail-title">{post.title}</h1>
            <p className="market-detail-price">{formatPrice(post.price)}</p>

            <div className="detail-meta">
              <div className="meta-item">
                <h4>용량</h4>
                <p>{post.volumeMl}ml</p>
              </div>
              <div className="meta-item">
                <h4>남은 양</h4>
                <p>{post.remainPercent}%</p>
                <div className="remain-bar">
                  <div className="remain-bar-fill" style={{ width: `${post.remainPercent}%` }} />
                </div>
              </div>
              <div className="meta-item">
                <h4>향 계열</h4>
                <p>{post.category ?? '-'}</p>
              </div>
              <div className="meta-item">
                <h4>판매자</h4>
                <p>{post.seller.nickname}</p>
              </div>
            </div>

            {post.content && <p className="market-detail-content">{post.content}</p>}

            {perfume && (
              <div className="market-linked">
                <span className="market-linked-label">컬렉션 향수</span>
                <Link to={`/detail/${perfume.id}`}>
                  {perfume.brand} {perfume.name} 정보 보기 →
                </Link>
                <Badge variant="category">{perfume.noteFamily}</Badge>
              </div>
            )}

            {isOwner && (
              <div className="owner-panel">
                <h4>내 판매글 관리</h4>
                <div className="status-buttons">
                  {MARKET_STATUS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`filter-btn ${post.status === s ? 'active' : ''}`}
                      onClick={() => post.status !== s && changeStatus(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="inline-actions">
                  <Button variant="secondary" size="small" onClick={() => navigate(`/market/${post.id}/edit`)}>
                    수정
                  </Button>
                  <button type="button" className="btn btn-small btn-danger" onClick={handleDelete}>
                    삭제
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
