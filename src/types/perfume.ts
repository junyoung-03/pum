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
