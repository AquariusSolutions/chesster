import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  persistReducer,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
} from 'redux-persist';
import createSagaMiddleware from 'redux-saga';

import authReducer from './authSlice';
import gameReducer from './gameSlice';
import rootSaga from './sagas/rootSaga';
import settingsReducer from './settingsSlice';
import timerReducer from './timerSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  game: gameReducer,
  settings: settingsReducer,
  timer: timerReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  throttle: 1000, // batch writes; the timer ticks every second
  whitelist: ['game', 'settings', 'timer'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);
const sagaMiddleware = createSagaMiddleware();

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

sagaMiddleware.run(rootSaga);

export const persistor = persistStore(store);

export type AppDispatch = typeof store.dispatch;
