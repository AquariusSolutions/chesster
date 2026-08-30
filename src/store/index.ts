import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  createMigrate,
  FLUSH,
  PAUSE,
  PERSIST,
  persistReducer,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
} from 'redux-persist';
import type { PersistedState } from 'redux-persist';

import { runRootSaga, sagaMiddleware } from '@/sagas';
import { normalizeLevel } from '@/lib/ai';

import authReducer from './authSlice';
import gameReducer from './gameSlice';
import legalReducer from './legalSlice';
import settingsReducer from './settingsSlice';
import timerReducer from './timerSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  game: gameReducer,
  legal: legalReducer,
  settings: settingsReducer,
  timer: timerReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

const migrations = {
  // Difficulty went from 'easy' | 'medium' | 'hard' to a 1–10 slider level.
  2: (state: PersistedState) => {
    const root = state as (PersistedState & { settings?: { difficulty?: unknown } }) | undefined;
    if (!root?.settings) return state;
    return {
      ...root,
      settings: { ...root.settings, difficulty: normalizeLevel(root.settings.difficulty) },
    };
  },
  // Games gained a `createdAt`. Without one the saved record has no sort key,
  // so it falls out of the newest-first history query entirely.
  3: (state: PersistedState) => {
    const root = state as (PersistedState & { game?: { createdAt?: number } }) | undefined;
    if (!root?.game || root.game.createdAt) return state;
    return { ...root, game: { ...root.game, createdAt: Date.now() } };
  },
};

const persistConfig = {
  key: 'root',
  version: 3,
  migrate: createMigrate(migrations),
  storage: AsyncStorage,
  throttle: 1000, // batch writes; the timer ticks every second
  whitelist: ['game', 'settings', 'timer', 'legal'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist dispatches these internal actions with non-serializable payloads.
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(sagaMiddleware),
});

runRootSaga();

export const persistor = persistStore(store);

export type AppDispatch = typeof store.dispatch;
