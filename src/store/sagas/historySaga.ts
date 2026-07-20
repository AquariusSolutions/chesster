import { call, select, takeEvery } from 'redux-saga/effects';

import { getStatus } from '@/lib/chess';
import { saveGame, SavedGame } from '@/lib/firestore';

import { commitMove } from '../gameSlice';
import type { RootState } from '../index';

const TERMINAL = [
  'checkmate',
  'stalemate',
  'draw-fifty-moves',
  'draw-insufficient-material',
  'draw-repetition',
];

/** After each move, if the game just ended, persist it to the user's history. */
function* maybeSaveFinishedGame() {
  const state: RootState = yield select();
  const uid = state.auth.user?.uid;
  if (!uid) return;

  const history = state.game.history;
  const status = getStatus(
    history[history.length - 1].state,
    history.map((h) => h.state),
  );
  if (!TERMINAL.includes(status)) return;

  const game: SavedGame = {
    id: state.game.id,
    result: status,
    moves: history.filter((h) => h.san).map((h) => h.san as string),
    humanColor: state.settings.humanColor,
    difficulty: state.settings.difficulty,
    elapsed: state.timer.elapsed,
    createdAt: Date.now(),
  };

  try {
    yield call(saveGame, uid, game);
  } catch (e) {
    // Common causes: Firestore not enabled, security rules deny the write, or
    // offline. Surfaced so it's diagnosable instead of silently lost.
    console.warn("[history] failed to save game:", e);
  }
}

export default function* historySaga() {
  yield takeEvery(commitMove.type, maybeSaveFinishedGame);
}
