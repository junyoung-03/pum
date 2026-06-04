import { createContext, ReactNode, useCallback, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface FavoriteContextType {
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  favoriteCount: number;
}

export const FavoriteContext = createContext<FavoriteContextType | null>(null);

interface FavoriteProviderProps {
  children: ReactNode;
}

export function FavoriteProvider({ children }: FavoriteProviderProps) {
  const [favoriteIds, setFavoriteIds] = useLocalStorage<string[]>('scentique-favorites', []);

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((favId) => favId !== id);
      }
      return [...prev, id];
    });
  }, [setFavoriteIds]);

  const isFavorite = useCallback((id: string) => {
    return favoriteIds.includes(id);
  }, [favoriteIds]);

  const value = useMemo(() => ({
    favoriteIds,
    toggleFavorite,
    isFavorite,
    favoriteCount: favoriteIds.length
  }), [favoriteIds, toggleFavorite, isFavorite]);

  return (
    <FavoriteContext.Provider value={value}>
      {children}
    </FavoriteContext.Provider>
  );
}
