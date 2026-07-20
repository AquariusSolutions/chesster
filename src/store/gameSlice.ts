import { createSlice, current, nanoid, PayloadAction } from '@reduxjs/toolkit';

import { applyMove, GameState, initialState, Move, moveToSan, PieceColor } from '@/lib/chess';

export interface HistoryEntry {
  state: GameState;
  /** Move that produced this state; null for the initial position. */
  move: Move | null;
  san: string | null;
}

export interface GameSliceState {
  /** Stable id for this game, used as the Firestore document id. */
  id: string;
  history: HistoryEntry[];
  /** Last move to slide into place (computer/tap moves); null for drags. */
  animatedMove: { from: number; to: number } | null;
}

function freshHistory(): HistoryEntry[] {
  return [{ state: initialState(), move: null, san: null }];
}

const initial: GameSliceState = {
  id: nanoid(),
  history: freshHistory(),
  animatedMove: null,
};

const gameSlice = createSlice({
  name: 'game',
  initialState: initial,
  reducers: {
    newGame(state) {
      state.id = nanoid();
      state.history = freshHistory();
      state.animatedMove = null;
    },

    commitMove(state, action: PayloadAction<{ move: Move; animate: boolean }>) {
      const { move, animate } = action.payload;
      // Snapshot the current (draft) position as a plain object so the pure
      // engine never operates on an Immer draft.
      const last = current(state.history[state.history.length - 1]);
      const before = last.state;
      state.history.push({
        state: applyMove(before, move),
        move,
        san: moveToSan(before, move),
      });
      state.animatedMove = animate ? { from: move.from, to: move.to } : null;
    },

    /**
     * Step back to the last position where it is the human's move, so undoing
     * against the computer rolls back its reply and your move together.
     */
    undo(state, action: PayloadAction<{ aiColor: PieceColor }>) {
      let next = state.history.slice(0, -1);
      while (next.length > 1 && next[next.length - 1].state.turn === action.payload.aiColor) {
        next = next.slice(0, -1);
      }
      if (next.length > 0) state.history = next;
      state.animatedMove = null;
    },
  },
});

export const { newGame, commitMove, undo } = gameSlice.actions;
export default gameSlice.reducer;
