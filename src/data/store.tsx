import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { RecommendAnswers, Review } from './perfumeData';

const initialReviews: Review[] = [
  {
    id: 'review-1',
    perfumeName: 'Maison Francis Kurkdjian Baccarat Rouge 540',
    authorName: '향수러버',
    rating: 5,
    content: '정말 환상적인 향입니다. 처음 맡았을 때 감동받아서 바로 구매했어요. 잔향도 오래가고, 어디서나 칭찬받는 향수입니다. 특별한 날에 뿌리면 하루종일 기분이 좋아져요.',
    createdAt: '2024-01-15T09:30:00Z'
  },
  {
    id: 'review-2',
    perfumeName: 'JO MALONE English Pear & Freesia',
    authorName: '데일리향수',
    rating: 4,
    content: '일상에서 쓰기 정말 좋은 향수예요. 너무 강하지 않고 은은하게 퍼져서 오피스에서도 부담없이 사용할 수 있어요. 배와 프리지아 향이 정말 청초해요.',
    createdAt: '2024-01-10T14:20:00Z'
  }
];

const emptyAnswers: RecommendAnswers = {
  mood: '',
  season: '',
  category: '',
  purpose: ''
};

const favoriteSlice = createSlice({
  name: 'favorite',
  initialState: { ids: [] as string[] },
  reducers: {
    toggleFavorite: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const index = state.ids.indexOf(id);
      if (index >= 0) {
        state.ids.splice(index, 1);
      } else {
        state.ids.push(id);
      }
    }
  }
});

const reviewSlice = createSlice({
  name: 'review',
  initialState: { list: initialReviews },
  reducers: {
    addReview: (
      state,
      action: PayloadAction<{
        perfumeName: string;
        authorName: string;
        rating: number;
        content: string;
      }>
    ) => {
      const newReview: Review = {
        id: `review-${Date.now()}`,
        ...action.payload,
        createdAt: new Date().toISOString()
      };
      state.list.unshift(newReview);
    }
  }
});

const recommendSlice = createSlice({
  name: 'recommend',
  initialState: { answers: emptyAnswers },
  reducers: {
    setAnswers: (state, action: PayloadAction<RecommendAnswers>) => {
      state.answers = action.payload;
    },
    resetAnswers: (state) => {
      state.answers = emptyAnswers;
    }
  }
});

const rootReducer = combineReducers({
  favorite: favoriteSlice.reducer,
  review: reviewSlice.reducer,
  recommend: recommendSlice.reducer
});

const persistConfig = {
  key: 'scentique',
  storage,
  whitelist: ['favorite', 'review']
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false })
});

export const persistor = persistStore(store);

export const { toggleFavorite } = favoriteSlice.actions;
export const { addReview } = reviewSlice.actions;
export const { setAnswers, resetAnswers } = recommendSlice.actions;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
