import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage, formatDate, formatPrice } from '../api/client';
import type { Order } from '../data/perfumeData';
import OrderSteps, { STAGE_GUIDE } from '../components/OrderSteps';

// 마이페이지 거래 관리
//   GET    /api/orders/sales       내가 판 물품 (구매자 개인정보 없음)
//   PATCH  /api/orders/:id/ship    관리자에게 발송 완료
//   GET    /api/orders/my          내가 산 물품
//   DELETE /api/orders/:id         구매 취소 (판매자 발송 전까지)
export default function MyOrdersSection() {
  const [sales, setSales] = useState<Order[]>([]);
  const [purchases, setPurchases] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    () =>
      Promise.all([api<Order[]>('/orders/sales'), api<Order[]>('/orders/my')])
        .then(([s, p]) => {
          setSales(s.data);
          setPurchases(p.data);
          setError('');
        })
        .catch((err) => setError(errorMessage(err)))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleShip = async (order: Order) => {
    if (!window.confirm(`'${order.post.title}' 물품을 SCENTIQUE(관리자)에게 보내셨나요?`)) return;
    try {
      await api(`/orders/${order.id}/ship`, 'PATCH');
      await load();
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  const handleCancel = async (order: Order) => {
    if (!window.confirm(`'${order.post.title}' 구매를 취소할까요?`)) return;
    try {
      await api(`/orders/${order.id}`, 'DELETE');
      await load();
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  const toShip = sales.filter((o) => o.stage === '구매신청').length;

  return (
    <div className="mypage-orders">
      {error && <p className="notice notice-error">{error}</p>}

      <div className="panel">
        <h3 className="panel-title">
          판매 거래 {toShip > 0 && <span className="count-pill">발송 필요 {toShip}</span>}
        </h3>
        <p className="muted-text">구매 신청이 들어온 물품을 SCENTIQUE(관리자)에게 보내 주세요. 확인 후 관리자가 구매자에게 배송합니다.</p>
        {loading ? (
          <p className="loading-text">불러오는 중...</p>
        ) : sales.length === 0 ? (
          <p className="empty-line">아직 구매 신청이 들어온 판매글이 없습니다.</p>
        ) : (
          <ul className="order-list">
            {sales.map((o) => (
              <li key={o.id}>
                <div className="order-item-head">
                  <div>
                    <Link to={`/market/${o.post.id}`} className="order-item-title">
                      {o.post.title}
                    </Link>
                    <p className="order-item-meta">
                      {formatPrice(o.price)} · 구매자 {o.buyer.nickname} · 신청 {formatDate(o.createdAt)}
                    </p>
                  </div>
                  {o.stage === '구매신청' && (
                    <button type="button" className="btn btn-primary btn-small" onClick={() => handleShip(o)}>
                      관리자에게 발송 완료
                    </button>
                  )}
                </div>
                <OrderSteps stage={o.stage} />
                <p className="order-guide">{STAGE_GUIDE[o.stage]}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel">
        <h3 className="panel-title">구매 내역</h3>
        {loading ? (
          <p className="loading-text">불러오는 중...</p>
        ) : purchases.length === 0 ? (
          <p className="empty-line">
            아직 구매한 물품이 없습니다. <Link to="/market">마켓 둘러보기</Link>
          </p>
        ) : (
          <ul className="order-list">
            {purchases.map((o) => (
              <li key={o.id}>
                <div className="order-item-head">
                  <div>
                    <Link to={`/market/${o.post.id}`} className="order-item-title">
                      {o.post.title}
                    </Link>
                    <p className="order-item-meta">
                      {formatPrice(o.price)} · 판매자 {o.seller.nickname} · 신청 {formatDate(o.createdAt)}
                    </p>
                  </div>
                  {o.stage === '구매신청' && (
                    <button type="button" className="btn btn-small btn-danger" onClick={() => handleCancel(o)}>
                      구매 취소
                    </button>
                  )}
                </div>
                <OrderSteps stage={o.stage} />
                {o.receiver && (
                  <p className="order-receiver">
                    배송지: {o.receiver.name} · {o.receiver.phone} · {o.receiver.address}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
