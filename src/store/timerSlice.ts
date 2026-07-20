import { createSlice } from '@reduxjs/toolkit';

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
  },
});

export const { tick, resetTimer } = timerSlice.actions;
export default timerSlice.reducer;
