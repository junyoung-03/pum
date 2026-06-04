import { useContext } from 'react';
import { FavoriteContext } from '../context/FavoriteContext';

export function useFavorites() {
  const context = useContext(FavoriteContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoriteProvider');
  }
  return context;
}
