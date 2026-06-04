import { useMemo } from 'react';
import { Perfume, RecommendAnswers } from '../types/perfume';
import { perfumeData } from '../data/perfumeData';
import { calculateRecommendation } from '../utils/recommendation';

export function usePerfumeRecommendation(answers: RecommendAnswers) {
  const recommendation = useMemo(() => {
    return calculateRecommendation(perfumeData, answers);
  }, [answers]);

  return recommendation;
}
