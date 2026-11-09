import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage, formatDate, formatPrice } from '../api/client';
import type { Order } from '../data/perfumeData';

// 관리자 거래 관리 (물품 인수 / 물품 인계)
//   GET    /api/orders               전체 거래 목록
//   PATCH  /api/orders/:id/receive   물품 인수: 판매자의 물품과 구매자의 대금을 받았음을 확인
//   PATCH  /api/orders/:id/deliver   물품 인계: 구매자 배송 정보로 물품 발송 → 판매완료
//   DELETE /api/orders/:id/receive   인수 취소: 인수완료 → 판매자발송
//   DELETE /api/orders/:id/deliver   인계 취소: 인계완료 → 인수완료 (판매글 예약중)
//   DELETE /api/orders/:id           거래 취소: 거래 삭제, 판매글 다시 판매중
export type AdminOrderTab = 'receive' | 'deliver';

const fmt = (value: string | null) => (value ? formatDate(value) : '-');

// 탭에 표시할 처리 대기 건수
export const countPending = (orders: Order[]): Record<AdminOrderTab, number> => ({
  receive: orders.filter((o) => o.stage === '판매자발송').length,
  deliver: orders.filter((o) => o.stage === '인수완료').length
});

type Action = 'receive' | 'deliver' | 'undoReceive' | 'undoDeliver' | 'cancel';

const ACTIONS: Record<
  Action,
  { method: 'PATCH' | 'DELETE'; path: (id: number) => string; confirm: (o: Order) => string; done: (o: Order) => string }
> = {
  receive: {
    method: 'PATCH',
    path: (id) => `/orders/${id}/receive`,
    confirm: (o) => `'${o.post.title}' 물품과 대금 ${formatPrice(o.price)}을 받았습니까?`,
    done: (o) => `'${o.post.title}' 물품 인수를 확인했습니다. 물품 인계 탭에서 구매자에게 보내 주세요.`
  },
  deliver: {
    method: 'PATCH',
    path: (id) => `/orders/${id}/deliver`,
    confirm: (o) => `'${o.post.title}' 물품을 구매자 ${o.receiver?.name ?? ''}님에게 보냈습니까?`,
    done: (o) => `'${o.post.title}' 물품 인계를 완료했습니다. 판매글이 판매완료로 바뀌었습니다.`
  },
  undoReceive: {
    method: 'DELETE',
    path: (id) => `/orders/${id}/receive`,
    confirm: (o) => `'${o.post.title}' 인수를 취소할까요?\n거래가 '판매자 발송' 단계로 돌아가 물품 인수 탭에 다시 표시됩니다.`,
    done: (o) => `'${o.post.title}' 인수를 취소했습니다. 물품 인수 탭에서 다시 확인할 수 있습니다.`
  },
  undoDeliver: {
    method: 'DELETE',
    path: (id) => `/orders/${id}/deliver`,
    confirm: (o) => `'${o.post.title}' 인계를 취소할까요?\n판매글이 판매완료에서 예약중으로 돌아갑니다.`,
    done: (o) => `'${o.post.title}' 인계를 취소했습니다. 판매글이 예약중으로 돌아갔습니다.`
  },
  cancel: {
    method: 'DELETE',
    path: (id) => `/orders/${id}`,
    confirm: (o) =>
      `'${o.post.title}' 거래를 취소할까요?\n구매 신청이 삭제되고 판매글이 다시 판매중으로 바뀝니다.\n(받은 물품·대금이 있다면 판매자·구매자에게 돌려줘야 합니다.)`,
    done: (o) => `'${o.post.title}' 거래를 취소했습니다. 판매글이 다시 판매중으로 바뀌었습니다.`
  }
};

export default function AdminOrdersPanel({
  tab,
  onCountChange
}: {
  tab: AdminOrderTab;
  onCountChange?: (counts: Record<AdminOrderTab, number>) => void;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'info' | 'error'; text: string } | null>(null);

  const load = useCallback(
    () =>
      api<Order[]>('/orders')
        .then(({ data }) => {
          setOrders(data);
          onCountChange?.(countPending(data));
        })
        .catch((err) => setMessage({ type: 'error', text: errorMessage(err) }))
        .finally(() => setLoading(false)),
    [onCountChange]
  );

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action: Action, o: Order) => {
    const a = ACTIONS[action];
    if (!window.confirm(a.confirm(o))) return;
    setBusyId(o.id);
    try {
      await api(a.path(o.id), a.method);
      setMessage({ type: 'info', text: a.done(o) });
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    } finally {
      await load();
      setBusyId(null);
    }
  };

  // 버튼 공통: primary(진행) / secondary(되돌리기) / danger(거래 취소)
  const btn = (action: Action, o: Order, label: string, variant: 'primary' | 'secondary' | 'danger') => (
    <button
      type="button"
      className={`btn btn-small ${variant === 'danger' ? 'btn-danger' : `btn-${variant}`}`}
      disabled={busyId === o.id}
      onClick={() => run(action, o)}
    >
      {label}
    </button>
  );

  const title = (o: Order) => (
    <Link to={`/market/${o.post.id}`} className="order-item-title">
      {o.post.title}
    </Link>
  );

  if (loading) return <p className="loading-block">불러오는 중...</p>;

  // 물품 인수: 판매자가 보낸 물품(판매자발송) + 아직 판매자가 보내지 않은 물품(구매신청)
  if (tab === 'receive') {
    const arrived = orders.filter((o) => o.stage === '판매자발송');
    const waiting = orders.filter((o) => o.stage === '구매신청');
    return (
      <>
        {message && <p className={`notice notice-${message.type}`}>{message.text}</p>}
        <div className="admin-layout admin-orders">
          <div className="panel">
            <h3 className="panel-title">인수 확인 대기 {arrived.length}건</h3>
            <p className="muted-text">판매자가 물품을 보냈습니다. 물품과 구매자의 대금을 받았으면 [인수 확인]을 눌러 주세요.</p>
            {arrived.length === 0 ? (
              <p className="empty-line">인수를 기다리는 물품이 없습니다.</p>
            ) : (
              <ul className="order-list">
                {arrived.map((o) => (
                  <li key={o.id}>
                    {title(o)}
                    <p className="order-item-meta">
                      거래 #{o.id} · {formatPrice(o.price)} · 판매자 {o.seller.nickname} → 구매자 {o.buyer.nickname}
                    </p>
                    <p className="order-item-meta">구매 신청 {fmt(o.createdAt)} · 판매자 발송 {fmt(o.shippedAt)}</p>
                    <div className="order-actions">
                      {btn('receive', o, '인수 확인', 'primary')}
                      {btn('cancel', o, '거래 취소 (판매중으로)', 'danger')}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel">
            <h3 className="panel-title">판매자 발송 대기 {waiting.length}건</h3>
            <p className="muted-text">구매 신청은 들어왔지만 판매자가 아직 물품을 보내지 않았습니다.</p>
            {waiting.length === 0 ? (
              <p className="empty-line">대기 중인 거래가 없습니다.</p>
            ) : (
              <ul className="order-list">
                {waiting.map((o) => (
                  <li key={o.id}>
                    {title(o)}
                    <p className="order-item-meta">
                      거래 #{o.id} · {formatPrice(o.price)} · 판매자 {o.seller.nickname} · 신청 {fmt(o.createdAt)}
                    </p>
                    <div className="order-actions">{btn('cancel', o, '거래 취소 (판매중으로)', 'danger')}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </>
    );
  }

  // 물품 인계: 인수가 끝난 물품을 구매자 배송 정보로 발송
  const ready = orders.filter((o) => o.stage === '인수완료');
  const done = orders.filter((o) => o.stage === '인계완료');
  return (
    <>
      {message && <p className={`notice notice-${message.type}`}>{message.text}</p>}
      <div className="admin-layout admin-orders">
        <div className="panel">
          <h3 className="panel-title">구매자 발송 대기 {ready.length}건</h3>
          <p className="muted-text">인수가 끝난 물품입니다. 아래 배송 정보로 구매자에게 보낸 뒤 [인계 완료]를 눌러 주세요.</p>
          {ready.length === 0 ? (
            <p className="empty-line">구매자에게 보낼 물품이 없습니다.</p>
          ) : (
            <ul className="order-list">
              {ready.map((o) => (
                <li key={o.id}>
                  {title(o)}
                  <p className="order-item-meta">
                    거래 #{o.id} · {formatPrice(o.price)} · 인수 {fmt(o.receivedAt)}
                  </p>
                  {o.receiver && (
                    <dl className="receiver-box">
                      <dt>받는 분</dt>
                      <dd>{o.receiver.name}</dd>
                      <dt>전화번호</dt>
                      <dd>{o.receiver.phone}</dd>
                      <dt>배송주소</dt>
                      <dd>{o.receiver.address}</dd>
                    </dl>
                  )}
                  <div className="order-actions">
                    {btn('deliver', o, '인계 완료', 'primary')}
                    {btn('undoReceive', o, '인수 취소', 'secondary')}
                    {btn('cancel', o, '거래 취소 (판매중으로)', 'danger')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <h3 className="panel-title">인계 완료 {done.length}건</h3>
          <p className="muted-text">잘못 처리했다면 [인계 취소]로 구매자 발송 대기로 되돌릴 수 있습니다.</p>
          {done.length === 0 ? (
            <p className="empty-line">완료된 거래가 없습니다.</p>
          ) : (
            <ul className="order-list">
              {done.map((o) => (
                <li key={o.id}>
                  {title(o)}
                  <p className="order-item-meta">
                    거래 #{o.id} · {formatPrice(o.price)} · {o.receiver?.name} · 발송 {fmt(o.deliveredAt)}
                  </p>
                  <div className="order-actions">{btn('undoDeliver', o, '인계 취소', 'secondary')}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
