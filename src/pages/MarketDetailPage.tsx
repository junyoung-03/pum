import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { api, errorMessage, formatDate, formatPrice } from '../api/client';
import type { RootState } from '../data/store';
import { MARKET_STATUS, MarketPost, MarketStatus, Order, Perfume } from '../data/perfumeData';
import { Badge, Button, PerfumeImage } from '../components/shared';
import Modal from '../components/Modal';
import OrderSteps, { STAGE_GUIDE } from '../components/OrderSteps';
import { statusClass } from './MarketListPage';

const PHONE_RE = /^01[016789]-?\d{3,4}-?\d{4}$/;
const emptyReceiver = { name: '', phone: '', address: '' };

// 판매글 상세
//   GET    /api/market/:id          상세
//   PATCH  /api/market/:id/status   거래 상태 변경 (본인, 구매 신청 전까지)
//   DELETE /api/market/:id          삭제 (본인, 구매 신청 전까지)
//   POST   /api/orders              구매 신청 (구매 모달) → 판매글 예약중
//   DELETE /api/orders/:id          구매 취소 (구매자, 판매자 발송 전까지)
export default function MarketDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state: RootState) => state.auth.user);

  const [post, setPost] = useState<MarketPost | null>(null);
  const [perfume, setPerfume] = useState<Perfume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 구매 모달
  const [buyOpen, setBuyOpen] = useState(false);
  const [receiver, setReceiver] = useState(emptyReceiver);
  const [buyError, setBuyError] = useState('');
  const [buying, setBuying] = useState(false);

  const loadPost = useCallback(
    () =>
      api<MarketPost>(`/market/${id}`).then(({ data }) => {
        setPost(data);
        return data;
      }),
    [id]
  );

  useEffect(() => {
    setLoading(true);
    loadPost()
      .then((data) => {
        if (data.perfumeId) {
          api<Perfume>(`/perfumes/${data.perfumeId}`)
            .then((res) => setPerfume(res.data))
            .catch(() => setPerfume(null));
        }
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [loadPost]);

  const closeBuy = useCallback(() => {
    if (!buying) setBuyOpen(false);
  }, [buying]);

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
  const isBuyer = Boolean(user && post.order && post.order.buyerId === user.id);
  const canBuy = !isOwner && post.status === '판매중' && !post.order;

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

  const openBuy = () => {
    if (!user) {
      if (window.confirm('구매는 로그인 후 이용하실 수 있습니다. 로그인 페이지로 이동하시겠습니까?')) {
        navigate('/login', { state: { from: location.pathname, message: '구매하려면 로그인이 필요합니다.' } });
      }
      return;
    }
    setReceiver(emptyReceiver);
    setBuyError('');
    setBuyOpen(true);
  };

  const handleBuy = async (e: FormEvent) => {
    e.preventDefault();
    const name = receiver.name.trim();
    const phone = receiver.phone.trim();
    const address = receiver.address.trim();
    if (!name || !phone || !address) {
      setBuyError('이름, 전화번호, 배송주소를 모두 입력해 주세요.');
      return;
    }
    if (!PHONE_RE.test(phone)) {
      setBuyError('전화번호는 010-1234-5678 형식으로 입력해 주세요.');
      return;
    }
    setBuying(true);
    try {
      await api<Order>('/orders', 'POST', { postId: post.id, name, phone, address });
      await loadPost();
      setBuyOpen(false);
      alert('구매 신청이 완료되었습니다. 판매자가 물품을 보내면 SCENTIQUE가 확인 후 배송해 드립니다.');
    } catch (err) {
      setBuyError(errorMessage(err));
      loadPost().catch(() => undefined);
    } finally {
      setBuying(false);
    }
  };

  const handleCancel = async () => {
    if (!post.order || !window.confirm('구매를 취소할까요?')) return;
    try {
      await api(`/orders/${post.order.id}`, 'DELETE');
      await loadPost();
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

            {/* 구매자: 구매하기 버튼 */}
            {canBuy && (
              <div className="buy-panel">
                <Button variant="primary" size="large" className="btn-block" onClick={openBuy}>
                  구매하기
                </Button>
                <p className="buy-panel-note">SCENTIQUE가 판매자의 물품을 먼저 받아 확인한 뒤 보내 드리는 안전거래입니다.</p>
              </div>
            )}

            {/* 구매자: 내 구매 진행 상황 */}
            {isBuyer && post.order && (
              <div className="owner-panel">
                <h4>내 구매 진행 상황</h4>
                <OrderSteps stage={post.order.stage} />
                <p className="order-guide">{STAGE_GUIDE[post.order.stage]}</p>
                <div className="inline-actions">
                  <Link to="/mypage" className="btn btn-secondary btn-small">
                    마이페이지에서 보기
                  </Link>
                  {post.order.stage === '구매신청' && (
                    <button type="button" className="btn btn-small btn-danger" onClick={handleCancel}>
                      구매 취소
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 판매자: 구매 신청이 들어온 판매글 → 상태는 거래 단계에 따라 자동 변경 */}
            {isOwner && post.order && (
              <div className="owner-panel">
                <h4>거래 진행 상황</h4>
                <OrderSteps stage={post.order.stage} />
                <p className="order-guide">
                  {post.order.stage === '구매신청'
                    ? '구매 신청이 들어왔습니다. 물품을 SCENTIQUE(관리자)에게 보낸 뒤 마이페이지에서 발송 완료를 눌러 주세요.'
                    : STAGE_GUIDE[post.order.stage]}
                </p>
                <Link to="/mypage" className="btn btn-primary btn-small">
                  마이페이지에서 발송 관리
                </Link>
              </div>
            )}

            {/* 판매자: 구매 신청 전에는 지금처럼 직접 관리 */}
            {isOwner && !post.order && (
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

      <Modal open={buyOpen} title="구매하기" onClose={closeBuy}>
        <form onSubmit={handleBuy} noValidate>
          <div className="modal-summary">
            <p className="modal-summary-title">{post.title}</p>
            <p className="modal-summary-price">{formatPrice(post.price)}</p>
          </div>

          {buyError && <p className="notice notice-error">{buyError}</p>}

          <div className="form-group">
            <label htmlFor="buy-name">이름</label>
            <input
              id="buy-name"
              value={receiver.name}
              onChange={(e) => setReceiver({ ...receiver, name: e.target.value })}
              maxLength={30}
              placeholder="받는 분 이름"
              autoComplete="name"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="buy-phone">전화번호</label>
            <input
              id="buy-phone"
              type="tel"
              value={receiver.phone}
              onChange={(e) => setReceiver({ ...receiver, phone: e.target.value })}
              maxLength={13}
              placeholder="010-1234-5678"
              autoComplete="tel"
            />
          </div>
          <div className="form-group">
            <label htmlFor="buy-address">배송주소</label>
            <textarea
              id="buy-address"
              value={receiver.address}
              onChange={(e) => setReceiver({ ...receiver, address: e.target.value })}
              maxLength={200}
              rows={3}
              placeholder="도로명 주소와 상세 주소"
              autoComplete="street-address"
            />
          </div>

          <p className="modal-note">입력한 배송 정보는 SCENTIQUE(관리자)만 확인하며, 판매자에게는 공개되지 않습니다.</p>

          <Button type="submit" variant="primary" size="large" className="btn-block" disabled={buying}>
            {buying ? '처리 중...' : `${formatPrice(post.price)} 구매`}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
