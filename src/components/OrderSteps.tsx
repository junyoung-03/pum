import { ORDER_STAGES, OrderStage } from '../data/perfumeData';

// 거래 진행 단계 표시: 구매 신청 → 판매자 발송 → 물품 인수 → 물품 인계
const STEP_LABELS: Record<OrderStage, string> = {
  구매신청: '구매 신청',
  판매자발송: '판매자 발송',
  인수완료: '물품 인수',
  인계완료: '물품 인계'
};

// 각 단계에서 다음에 누가 무엇을 해야 하는지 안내
export const STAGE_GUIDE: Record<OrderStage, string> = {
  구매신청: '판매자가 물품을 SCENTIQUE(관리자)에게 보내야 합니다.',
  판매자발송: '관리자가 물품과 대금을 확인하고 있습니다. (물품 인수)',
  인수완료: '확인이 끝났습니다. 관리자가 구매자에게 물품을 보냅니다. (물품 인계)',
  인계완료: '구매자에게 물품을 보냈습니다. 거래가 완료되었습니다.'
};

export default function OrderSteps({ stage }: { stage: OrderStage }) {
  const current = ORDER_STAGES.indexOf(stage);
  return (
    <ol className="order-steps" aria-label="거래 진행 단계">
      {ORDER_STAGES.map((s, i) => (
        <li key={s} className={i < current ? 'done' : i === current ? 'current' : ''} aria-current={i === current ? 'step' : undefined}>
          <span className="order-step-dot">{i < current ? '✓' : i + 1}</span>
          <span className="order-step-label">{STEP_LABELS[s]}</span>
        </li>
      ))}
    </ol>
  );
}
