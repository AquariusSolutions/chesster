import { call, debounce, put, select, takeLatest } from 'redux-saga/effects';

import { getStatus } from '@/lib/chess';
import {
  loadCurrentGameId,
  loadGame,
  SavedGame,
  saveCurrentGameId,
  saveGame,
  toPlayedMove,
  UNFINISHED,
} from '@/lib/realtime-db';

import { authStateChanged } from '@/store/authSlice';
import { commitMove, gameRestored, newGame, undo } from '@/store/gameSlice';
import { setElapsed } from '@/store/timerSlice';
import type { RootState } from '@/store/index';

/** Moves land in bursts (yours, then the computer's reply) — batch the writes. */
const SYNC_DEBOUNCE_MS = 1000;

/** Project the store into the record we persist. */
function toSavedGame(state: RootState): SavedGame {
  const history = state.game.history;
  const status = getStatus(
    history[history.length - 1].state,
    history.map((h) => h.state),
  );
  const finished = status !== 'playing' && status !== 'check';

  return {
    id: state.game.id,
    result: finished ? status : UNFINISHED,
    moves: history.flatMap((h) => (h.move ? [toPlayedMove(h.move)] : [])),
    humanColor: state.settings.humanColor,
    difficulty: state.settings.difficulty,
    elapsed: state.timer.elapsed,
    createdAt: state.game.createdAt,
  };
}

/**
 * Persist the game after every move. Because a game is written from its first
 * move onwards, walking away from it — starting a new one, or opening another
 * from history — leaves it stored as `unfinished` with no extra step.
 */
function* syncCurrentGame() {
  const state: RootState = yield select();
  const uid = state.auth.user?.uid;
  if (!uid) return;

  try {
    // Move the pointer even before the first move, so starting a new game
    // doesn't leave it aimed at the one you just walked away from.
    yield call(saveCurrentGameId, uid, state.game.id);
    // A game nobody has moved in isn't worth a history entry.
    if (state.game.history.length > 1) {
      yield call(saveGame, uid, toSavedGame(state));
    }
  } catch (e) {
    console.warn('[match] failed to sync game:', e);
  }
}

/**
 * On sign-in, pick the in-progress game back up — but never over the top of
 * local play. It only lands when nothing has been played here yet, or when it
 * is the same game and the stored copy got further along elsewhere.
 */
function* restoreCurrentGame(action: ReturnType<typeof authStateChanged>) {
  const user = action.payload;
  if (!user) return;

  try {
    const id: string | null = yield call(loadCurrentGameId, user.uid);
    if (!id) return;

    const game: RootState['game'] = yield select((s: RootState) => s.game);
    const localMoves = game.history.length - 1;
    if (localMoves > 0 && id !== game.id) return;

    const saved: SavedGame | null = yield call(loadGame, user.uid, id);
    if (saved?.result !== UNFINISHED) return;
    if (saved.moves.length <= localMoves) return;

    yield put(
      gameRestored({ id: saved.id, createdAt: saved.createdAt, moves: saved.moves }),
    );
    yield put(setElapsed(saved.elapsed));
  } catch (e) {
    console.warn('[match] failed to restore game:', e);
  }
}

export default function* matchSaga() {
  yield debounce(
    SYNC_DEBOUNCE_MS,
    [commitMove.type, undo.type, newGame.type, gameRestored.type],
    syncCurrentGame,
  );
  yield takeLatest(authStateChanged.type, restoreCurrentGame);
}
