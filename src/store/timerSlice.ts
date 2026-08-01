import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TimerSliceState {
  /** Seconds elapsed in the current game. */
  elapsed: number;
}

const initial: TimerSliceState = { elapsed: 0 };

const timerSlice = createSlice({
  name: 'timer',
  initialState: initial,
  reducers: {
    tick(state) {
      state.elapsed += 1;
    },
    resetTimer(state) {
      state.elapsed = 0;
    },
    /** Adopt the clock of a game picked back up from history. */
    setElapsed(state, action: PayloadAction<number>) {
      state.elapsed = action.payload;
    },
  },
});

export const { tick, resetTimer, setElapsed } = timerSlice.actions;
export default timerSlice.reducer;
