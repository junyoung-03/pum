// SCENTIQUE 프론트에서 쓰는 타입과 선택지 목록
// 실제 향수·리뷰·찜·추천·판매글 데이터는 MySQL에 있고, 서버 API(/api/...)로 받아옵니다.

export type Mood = '고급스러운' | '상큼한' | '차분한' | '로맨틱한' | '세련된' | '우아한';
export type Season = '봄' | '여름' | '가을' | '겨울';
export type Purpose = '데일리' | '데이트' | '출근' | '특별한 날';
export type Category = 'Floral' | 'Woody' | 'Musk' | 'Citrus' | 'Amber';
export type PriceLevel = 'Premium' | 'Luxury' | 'Niche';
export type MarketStatus = '판매중' | '예약중' | '판매완료';
// 거래 단계: 구매신청 → 판매자발송 → 인수완료(물품 인수) → 인계완료(물품 인계)
export type OrderStage = '구매신청' | '판매자발송' | '인수완료' | '인계완료';

export const CATEGORIES: Category[] = ['Floral', 'Woody', 'Musk', 'Citrus', 'Amber'];
export const MOODS: Mood[] = ['고급스러운', '상큼한', '차분한', '로맨틱한', '세련된', '우아한'];
export const SEASONS: Season[] = ['봄', '여름', '가을', '겨울'];
export const PURPOSES: Purpose[] = ['데일리', '데이트', '출근', '특별한 날'];
export const PRICE_LEVELS: PriceLevel[] = ['Premium', 'Luxury', 'Niche'];
export const MARKET_STATUS: MarketStatus[] = ['판매중', '예약중', '판매완료'];
export const ORDER_STAGES: OrderStage[] = ['구매신청', '판매자발송', '인수완료', '인계완료'];

// GET /api/perfumes, /api/perfumes/:id
export interface Perfume {
  id: string;
  name: string;
  brand: string;
  category: Category;
  noteFamily: string;
  mood: Mood[];
  moodTags: string[];
  season: Season[];
  purpose: Purpose[];
  price: PriceLevel;
  description: string;
  highlight: string;
  topNote: string[];
  middleNote: string[];
  baseNote: string[];
  image: string;
  color: string;
  shortCopy: string;
  featured?: boolean;
  featuredOrder?: number | null;
}

// GET /api/perfumes/featured
export interface FeaturedPerfume {
  id: string;
  brand: string;
  name: string;
  shortCopy: string;
  image: string;
  color: string;
  featuredOrder: number;
}

// GET /api/perfumes/:id/similar
export interface SimilarPerfume {
  id: string;
  brand: string;
  name: string;
  image: string;
  category: Category;
  similarity: number;
}

// 회원
export interface User {
  id: number;
  email: string;
  nickname: string;
  role: 'user' | 'admin';
  createdAt?: string;
}

// 리뷰
export interface Review {
  id: number;
  perfumeId: string;
  userId: number;
  rating: number;
  content: string;
  user: { id: number; nickname: string };
  perfume: { id: string; brand: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStats {
  perfumeId: string;
  reviewCount: number;
  averageRating: number;
  distribution: Record<string, number>;
}

// 찜: GET /api/favorites
export interface Favorite {
  id: number;
  perfumeId: string;
  perfume: Perfume;
  createdAt: string;
}

// 찜 순위: GET /api/favorites/ranking (찜이 많은 순서)
export interface FavoriteRank {
  perfumeId: string;
  favoriteCount: number;
  perfume: PerfumeSummary;
}

// 추천
export interface RecommendAnswers {
  mood: Mood | '';
  season: Season | '';
  category: Category | '';
  purpose: Purpose | '';
}

export interface RecommendQuestion {
  id: number;
  key: keyof RecommendAnswers;
  title: string;
  subtitle: string;
  options: string[];
}

export interface RecommendResult {
  historyId: number | null;
  savedToHistory: boolean;
  answers: RecommendAnswers;
  perfume: Perfume;
  score: number;
  matchedCriteria: string[];
  reason: string;
}

export interface PerfumeSummary {
  id: string;
  brand: string;
  name: string;
  image: string;
}

export interface RecommendHistory extends RecommendAnswers {
  id: number;
  perfume: PerfumeSummary | null;
  score: number;
  matchedCriteria: string[];
  reason: string;
  createdAt: string;
}

export interface RecommendStats {
  totalCount: number;
  topAnswers: Record<keyof RecommendAnswers, { value: string; count: number }[]>;
  topPerfumes: { perfumeId: string; count: number; perfume: PerfumeSummary }[];
}

// 중고 판매글
export interface MarketPost {
  id: number;
  title: string;
  perfumeId: string | null;
  brand: string;
  category: Category | null;
  volumeMl: number;
  remainPercent: number;
  price: number;
  content: string | null;
  status: MarketStatus;
  seller: { id: number; nickname: string };
  // 구매 신청이 들어온 경우 거래 진행 정보 (개인정보 없음)
  order: { id: number; stage: OrderStage; buyerId: number } | null;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = '카드' | '카카오페이' | '네이버페이' | '계좌이체';
export type PaymentStatus = '결제완료' | '환불완료';

export const PAYMENT_METHODS: PaymentMethod[] = ['카드', '카카오페이', '네이버페이', '계좌이체'];

export interface Payment {
  id: number;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  merchantUid: string;
  paidAt: string;
  refundedAt: string | null;
}

// GET /api/orders, /api/orders/my, /api/orders/sales, /api/orders/:id
export interface Order {
  id: number;
  stage: OrderStage;
  price: number;
  post: {
    id: number;
    title: string;
    brand: string;
    perfumeId: string | null;
    status: MarketStatus;
    seller: { id: number; nickname: string };
  };
  buyer: { id: number; nickname: string };
  payment?: Payment | null;
  // 구매자 배송 정보 (구매자 본인과 관리자에게만 내려옴)
  receiverName?: string;
  receiverPhone?: string;
  address?: string;
  shippedAt: string | null;
  receivedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
