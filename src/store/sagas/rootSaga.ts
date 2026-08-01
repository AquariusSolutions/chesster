import { all, delay, fork, put, select, takeLatest } from 'redux-saga/effects';

import { getStatus } from '@/lib/chess';

import { newGame } from '../gameSlice';
import { resetTimer, tick } from '../timerSlice';
import aiSaga from './aiSaga';
import authSaga from './authSaga';
import matchSaga from './matchSaga';
import settingsSaga from './settingsSaga';
import type { RootState } from '../index';

/**
 * Advance the game clock once per second, but only after the first move has
 * been played and until the game ends. A fresh game stays at 0:00.
 */
function* clockSaga() {
  while (true) {
    yield delay(1000);
    const history: RootState['game']['history'] = yield select((s: RootState) => s.game.history);
    const started = history.length > 1;
    const status = getStatus(history[history.length - 1].state);
    const gameOver = status !== 'playing' && status !== 'check';
    if (started && !gameOver) yield put(tick());
  }
}

/** Reset the clock whenever a new game starts. */
function* resetClockOnNewGame() {
  yield takeLatest(newGame.type, function* () {
    yield put(resetTimer());
  });
}

export default function* rootSaga() {
  yield all([
    authSaga(),
    aiSaga(),
    settingsSaga(),
    matchSaga(),
    fork(clockSaga),
    resetClockOnNewGame(),
  ]);
}
