import { RecommendQuestion } from './perfumeData';

export const questionData: RecommendQuestion[] = [
  {
    id: 1,
    key: 'mood',
    title: '어떤 분위기의 향수를 찾고 계신가요?',
    subtitle: '오늘 연출하고 싶은 무드를 선택해주세요',
    options: ['고급스러운', '상큼한', '차분한', '로맨틱한']
  },
  {
    id: 2,
    key: 'season',
    title: '주로 어느 계절에 사용하실 예정인가요?',
    subtitle: '계절에 따라 어울리는 향이 달라집니다',
    options: ['봄', '여름', '가을', '겨울']
  },
  {
    id: 3,
    key: 'category',
    title: '선호하는 향 계열을 선택해주세요',
    subtitle: '가장 끌리는 향의 특성을 골라주세요',
    options: ['Floral', 'Woody', 'Musk', 'Citrus', 'Amber']
  },
  {
    id: 4,
    key: 'purpose',
    title: '향수를 어떤 상황에서 주로 사용하실 건가요?',
    subtitle: 'TPO에 맞는 향수를 추천해드릴게요',
    options: ['데일리', '데이트', '출근', '특별한 날']
  }
];
