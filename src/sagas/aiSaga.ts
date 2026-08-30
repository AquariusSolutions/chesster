import { REHYDRATE } from 'redux-persist';
import { delay, put, select, takeLatest } from 'redux-saga/effects';

import { chooseMove } from '@/lib/ai';
import { getStatus } from '@/lib/chess';

import { commitMove, gameRestored, newGame } from '@/store/gameSlice';
import { setHumanColor } from '@/store/settingsSlice';
import type { RootState } from '@/store/index';

/** How long the computer "thinks" before playing, so its move feels deliberate. */
const THINK_MS = 450;

/**
 * The controller: whenever the position changes, if it is now the computer's
 * turn, search for a move and play it. `takeLatest` cancels a pending think if
 * the human undoes or starts a new game first.
 */
function* maybePlayComputerMove() {
  const history: RootState['game']['history'] = yield select((s: RootState) => s.game.history);
  const humanColor: RootState['settings']['humanColor'] = yield select(
    (s: RootState) => s.settings.humanColor,
  );
  const difficulty: RootState['settings']['difficulty'] = yield select(
    (s: RootState) => s.settings.difficulty,
  );

  const state = history[history.length - 1].state;
  const status = getStatus(state);
  const gameOver = status !== 'playing' && status !== 'check';
  const aiColor = humanColor === 'w' ? 'b' : 'w';
  if (gameOver || state.turn !== aiColor) return;

  yield delay(THINK_MS);
  const move = chooseMove(state, difficulty);
  if (move) yield put(commitMove({ move, animate: true }));
}

export default function* aiSaga() {
  yield takeLatest(
    [commitMove.type, newGame.type, gameRestored.type, setHumanColor.type, REHYDRATE],
    maybePlayComputerMove,
  );
}
