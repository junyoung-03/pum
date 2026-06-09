export type Mood = '고급스러운' | '상큼한' | '차분한' | '로맨틱한' | '세련된' | '우아한';
export type Season = '봄' | '여름' | '가을' | '겨울';
export type Purpose = '데일리' | '데이트' | '출근' | '특별한 날';
export type Category = 'Floral' | 'Woody' | 'Musk' | 'Citrus' | 'Amber';
export type PriceLevel = 'Premium' | 'Luxury' | 'Niche';

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
}

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

export interface Review {
  id: string;
  perfumeName: string;
  authorName: string;
  rating: number;
  content: string;
  createdAt: string;
}

export const perfumeData: Perfume[] = [
  {
    id: 'chanel-chance-eau-tendre',
    name: 'Chance Eau Tendre',
    brand: 'CHANEL',
    category: 'Floral',
    noteFamily: '플로럴 / 프루티',
    mood: ['로맨틱한', '상큼한', '우아한'],
    moodTags: ['로맨틱', '데일리', '부드러운'],
    season: ['봄', '여름'],
    purpose: ['데일리', '데이트'],
    price: 'Premium',
    description: '자스민과 화이트 머스크가 어우러진 부드럽고 여성스러운 플로럴 향수입니다. 플로럴과 프루티 노트가 조화를 이루며, 로맨틱하고 데일리하게 사용하기 좋은 대중적인 베스트셀러입니다.',
    highlight: '여성스럽고 대중적인 베스트 향수',
    topNote: ['자몽', '퀸스'],
    middleNote: ['히아신스', '자스민'],
    baseNote: ['화이트 머스크', '아이리스', '앰버'],
    image: '/images/perfumes/chanel-chance-eau-tendre.png',
    color: '#FFE4E8',
    shortCopy: '여성스럽고 대중적인 베스트 향수',
    featured: true
  },
  {
    id: 'dior-sauvage-edp',
    name: 'Sauvage Eau de Parfum',
    brand: 'DIOR',
    category: 'Citrus',
    noteFamily: '시트러스 / 바닐라 / 스파이시',
    mood: ['고급스러운', '세련된'],
    moodTags: ['강렬한', '세련된', '남성적인'],
    season: ['가을', '겨울'],
    purpose: ['출근', '특별한 날'],
    price: 'Premium',
    description: '베르가못의 상쾌한 시트러스와 바닐라, 스파이시 노트가 어우러진 강렬하고 세련된 남성 향수입니다. 남성 향수의 대표 상품으로, 도시적이고 카리스마 있는 인상을 완성합니다.',
    highlight: '남성 향수 대표 상품',
    topNote: ['베르가못', '페퍼'],
    middleNote: ['시쿠안 페퍼', '라벤더', '핑크 페퍼'],
    baseNote: ['앰브록산', '바닐라', '라브다넘'],
    image: '/images/perfumes/dior-sauvage-edp.png',
    color: '#2C3E50',
    shortCopy: '남성 향수 대표 상품',
    featured: true
  },
  {
    id: 'jo-malone-english-pear',
    name: 'English Pear & Freesia',
    brand: 'JO MALONE',
    category: 'Floral',
    noteFamily: '프루티 / 플로럴',
    mood: ['상큼한', '우아한', '차분한'],
    moodTags: ['산뜻한', '깨끗한', '가을 느낌'],
    season: ['봄', '가을'],
    purpose: ['데일리', '출근'],
    price: 'Premium',
    description: '잘 익은 배의 프루티함과 프리지아의 플로럴 향이 만나 산뜻하고 깨끗한 무드를 연출합니다. 가을에 특히 잘 어울리며, 누구나 좋아할 만한 데일리 향수입니다.',
    highlight: '누구나 좋아할 만한 데일리 향',
    topNote: ['킹 윌리엄 배', '멜론'],
    middleNote: ['프리지아', '장미'],
    baseNote: ['패출리', '앰버', '화이트 머스크'],
    image: '/images/perfumes/jo-malone-english-pear.png',
    color: '#D4E6B5',
    shortCopy: '누구나 좋아할 만한 데일리 향',
    featured: true
  },
  {
    id: 'le-labo-santal-33',
    name: 'Santal 33',
    brand: 'LE LABO',
    category: 'Woody',
    noteFamily: '우디 / 스모키',
    mood: ['고급스러운', '차분한', '세련된'],
    moodTags: ['감각적인', '도시적인', '유니섹스'],
    season: ['가을', '겨울'],
    purpose: ['출근', '특별한 날'],
    price: 'Niche',
    description: '샌달우드와 스모키 노트가 어우러진 감각적이고 도시적인 유니섹스 향수입니다. 니치 향수의 정수를 담아, 세련된 도시인의 시그니처 향으로 사랑받고 있습니다.',
    highlight: '니치 향수 느낌을 주는 핵심 상품',
    topNote: ['카다몬', '아이리스', '바이올렛'],
    middleNote: ['앰브록스', '호주 샌달우드', '파피루스'],
    baseNote: ['시더우드', '가죽', '스모키'],
    image: '/images/perfumes/le-labo-santal-33.png',
    color: '#C9B896',
    shortCopy: '니치 향수 느낌을 주는 핵심 상품'
  },
  {
    id: 'diptyque-do-son',
    name: 'Do Son Eau de Parfum',
    brand: 'DIPTYQUE',
    category: 'Floral',
    noteFamily: '튜베로즈 / 화이트 플로럴',
    mood: ['로맨틱한', '우아한', '고급스러운'],
    moodTags: ['우아한', '여성스러운', '고급스러운'],
    season: ['봄', '여름'],
    purpose: ['데이트', '특별한 날'],
    price: 'Niche',
    description: '베트남 해변의 튜베로즈와 화이트 플로럴이 어우러진 우아하고 여성스러운 향수입니다. 고급스러운 플로럴 계열의 대표 상품으로, 관능적이면서도 세련된 무드를 선사합니다.',
    highlight: '플로럴 계열 대표 상품',
    topNote: ['오렌지 블라썸', '핑크 페퍼'],
    middleNote: ['튜베로즈', '자스민', '장미'],
    baseNote: ['벤조인', '머스크'],
    image: '/images/perfumes/diptyque-do-son.png',
    color: '#F8F4E3',
    shortCopy: '플로럴 계열 대표 상품'
  },
  {
    id: 'mfk-baccarat-rouge-540',
    name: 'Baccarat Rouge 540',
    brand: 'Maison Francis Kurkdjian',
    category: 'Amber',
    noteFamily: '앰버 / 우디 / 플로럴',
    mood: ['고급스러운', '로맨틱한', '세련된'],
    moodTags: ['화려한', '고급스러운', '특별한 날'],
    season: ['가을', '겨울'],
    purpose: ['특별한 날', '데이트'],
    price: 'Niche',
    description: '사프란과 앰버, 우디·플로럴 노트가 빛나는 아우라처럼 어우러진 화려하고 고급스러운 향수입니다. 특별한 날을 위한 프리미엄 이미지를 가장 잘 보여주는 시그니처 향입니다.',
    highlight: '프리미엄 이미지를 가장 잘 보여줌',
    topNote: ['사프란', '자스민'],
    middleNote: ['앰버그리스', '시더우드'],
    baseNote: ['퍼 발삼', '앰버', '머스크'],
    image: '/images/perfumes/mfk-baccarat-rouge-540.png',
    color: '#E8D4C4',
    shortCopy: '프리미엄 이미지를 가장 잘 보여줌'
  },
  {
    id: 'byredo-mojave-ghost',
    name: 'Mojave Ghost',
    brand: 'BYREDO',
    category: 'Musk',
    noteFamily: '우디 / 플로럴 / 머스크',
    mood: ['차분한', '세련된', '우아한'],
    moodTags: ['신비로운', '부드러운', '유니섹스'],
    season: ['봄', '가을'],
    purpose: ['데일리', '출근'],
    price: 'Niche',
    description: '우디, 플로럴, 머스크가 신비롭고 부드럽게 어우러진 유니섹스 향수입니다. 감성적인 브랜드 무드를 연출하기에 좋으며, 미니멀하고 몽환적인 아름다움을 표현합니다.',
    highlight: '감성적인 브랜드 무드 연출에 좋음',
    topNote: ['암브렛', '자몽', '사포딜라'],
    middleNote: ['마그놀리아', '바이올렛', '샌달우드'],
    baseNote: ['시더우드', '머스크', '앰버우드'],
    image: '/images/perfumes/byredo-mojave-ghost.png',
    color: '#F5EEE6',
    shortCopy: '감성적인 브랜드 무드 연출에 좋음'
  },
  {
    id: 'tom-ford-oud-wood',
    name: 'Oud Wood',
    brand: 'TOM FORD',
    category: 'Woody',
    noteFamily: '오드 / 우디 / 스파이시',
    mood: ['고급스러운', '차분한', '세련된'],
    moodTags: ['깊은', '고급스러운', '성숙한'],
    season: ['가을', '겨울'],
    purpose: ['특별한 날', '출근'],
    price: 'Niche',
    description: '오드, 우디, 스파이시 노트가 깊고 고급스럽게 어우러진 성숙한 럭셔리 향수입니다. 프리미엄·럭셔리 분위기를 강화하며, 관능적이고 세련된 인상을 완성합니다.',
    highlight: '프리미엄·럭셔리 분위기 강화',
    topNote: ['로즈우드', '카다몬', '중국 후추'],
    middleNote: ['오드', '샌달우드', '베티버'],
    baseNote: ['통카빈', '바닐라', '앰버'],
    image: '/images/perfumes/tom-ford-oud-wood.png',
    color: '#3D2B1F',
    shortCopy: '프리미엄·럭셔리 분위기 강화'
  }
];

/** 대표 향수 ID (Best Collection 노출 순서) */
export const featuredPerfumeIds = [
  'dior-sauvage-edp',
  'chanel-chance-eau-tendre',
  'jo-malone-english-pear'
];

export const featuredPerfumes = featuredPerfumeIds
  .map((id) => perfumeData.find((p) => p.id === id))
  .filter((p): p is Perfume => p !== undefined);
