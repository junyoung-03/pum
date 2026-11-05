import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { RecommendAnswers, RecommendResult, User } from './perfumeData';

const emptyAnswers: RecommendAnswers = {
  mood: '',
  season: '',
  category: '',
  purpose: ''
};

// 로그인 정보 (토큰 + 회원 정보) → 새로고침해도 유지되도록 저장
const authSlice = createSlice({
  name: 'auth',
  initialState: { token: null as string | null, user: null as User | null },
  reducers: {
    loginSuccess: (state, action: PayloadAction<{ token: string; user: User }>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
    }
  }
});

// 찜한 향수 id 목록 (서버의 내 찜 목록과 맞춰서 보관 → 하트 표시, 헤더 숫자)
const favoriteSlice = createSlice({
  name: 'favorite',
  initialState: { ids: [] as string[] },
  reducers: {
    setFavorites: (state, action: PayloadAction<string[]>) => {
      state.ids = action.payload;
    },
    addFavorite: (state, action: PayloadAction<string>) => {
      if (!state.ids.includes(action.payload)) state.ids.push(action.payload);
    },
    removeFavorite: (state, action: PayloadAction<string>) => {
      state.ids = state.ids.filter((id) => id !== action.payload);
    }
  },
  extraReducers: (builder) => {
    builder.addCase(authSlice.actions.logout, (state) => {
      state.ids = [];
    });
  }
});

// 추천 설문 답변과 서버가 돌려준 추천 결과
const recommendSlice = createSlice({
  name: 'recommend',
  initialState: { answers: emptyAnswers, result: null as RecommendResult | null },
  reducers: {
    setAnswers: (state, action: PayloadAction<RecommendAnswers>) => {
      state.answers = action.payload;
    },
    setResult: (state, action: PayloadAction<RecommendResult>) => {
      state.result = action.payload;
    },
    resetAnswers: (state) => {
      state.answers = emptyAnswers;
      state.result = null;
    }
  }
});

const rootReducer = combineReducers({
  auth: authSlice.reducer,
  favorite: favoriteSlice.reducer,
  recommend: recommendSlice.reducer
});

const persistConfig = {
  key: 'scentique-v2',
  storage,
  whitelist: ['auth']
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false })
});

export const persistor = persistStore(store);

export const { loginSuccess, setUser, logout } = authSlice.actions;
export const { setFavorites, addFavorite, removeFavorite } = favoriteSlice.actions;
export const { setAnswers, setResult, resetAnswers } = recommendSlice.actions;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
