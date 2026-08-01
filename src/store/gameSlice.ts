import { createSlice, current, nanoid, PayloadAction } from '@reduxjs/toolkit';

import {
  allLegalMoves,
  applyMove,
  GameState,
  initialState,
  Move,
  moveToSan,
  PieceColor,
  PlayedMove,
} from '@/lib/chess';

export interface HistoryEntry {
  state: GameState;
  /** Move that produced this state; null for the initial position. */
  move: Move | null;
  san: string | null;
}

export interface GameSliceState {
  /** Stable id for this game, used as its key in the Realtime Database. */
  id: string;
  /** Unix ms the game started. Fixed for its lifetime, so history stays ordered. */
  createdAt: number;
  history: HistoryEntry[];
  /** Last move to slide into place (computer/tap moves); null for drags. */
  animatedMove: { from: number; to: number } | null;
}

function freshHistory(): HistoryEntry[] {
  return [{ state: initialState(), move: null, san: null }];
}

const initial: GameSliceState = {
  id: nanoid(),
  createdAt: Date.now(),
  history: freshHistory(),
  animatedMove: null,
};

const gameSlice = createSlice({
  name: 'game',
  initialState: initial,
  reducers: {
    // The id and timestamp come from `prepare` so the reducer stays pure.
    newGame: {
      reducer(state, action: PayloadAction<{ id: string; createdAt: number }>) {
        state.id = action.payload.id;
        state.createdAt = action.payload.createdAt;
        state.history = freshHistory();
        state.animatedMove = null;
      },
      prepare() {
        return { payload: { id: nanoid(), createdAt: Date.now() } };
      },
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
     * Adopt a stored game — synced from another device, or picked back up from
     * history — replaying its move list against the engine to rebuild history.
     */
    gameRestored(
      state,
      action: PayloadAction<{ id: string; createdAt: number; moves: PlayedMove[] }>,
    ) {
      const history = freshHistory();
      for (const played of action.payload.moves) {
        const before = history[history.length - 1].state;
        const move = allLegalMoves(before).find(
          (m) =>
            m.from === played.from &&
            m.to === played.to &&
            m.promotion === played.promotion,
        );
        // A move that no longer fits means the list is stale or corrupt; keep
        // the prefix that replayed cleanly rather than dropping the game.
        if (!move) break;
        history.push({ state: applyMove(before, move), move, san: moveToSan(before, move) });
      }
      state.id = action.payload.id;
      state.createdAt = action.payload.createdAt;
      state.history = history;
      state.animatedMove = null;
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

export const { newGame, commitMove, gameRestored, undo } = gameSlice.actions;
export default gameSlice.reducer;
