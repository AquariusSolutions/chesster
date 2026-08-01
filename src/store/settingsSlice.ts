import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { BoardThemeKey } from '@/constants/board-themes';
import { clampLevel, DEFAULT_LEVEL, Difficulty, normalizeLevel } from '@/lib/ai';
import { PieceColor } from '@/lib/chess';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface SettingsSliceState {
  /** The color the human plays; the computer takes the other side. */
  humanColor: PieceColor;
  difficulty: Difficulty;
  boardTheme: BoardThemeKey;
  themePreference: ThemePreference;
}

const initial: SettingsSliceState = {
  humanColor: 'w',
  difficulty: DEFAULT_LEVEL,
  boardTheme: 'ocean',
  themePreference: 'system',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState: initial,
  reducers: {
    setHumanColor(state, action: PayloadAction<PieceColor>) {
      state.humanColor = action.payload;
    },
    setDifficulty(state, action: PayloadAction<Difficulty>) {
      state.difficulty = clampLevel(action.payload);
    },
    setBoardTheme(state, action: PayloadAction<BoardThemeKey>) {
      state.boardTheme = action.payload;
    },
    setThemePreference(state, action: PayloadAction<ThemePreference>) {
      state.themePreference = action.payload;
    },
    /** Bulk-apply settings loaded from Firestore (only provided keys). */
    settingsLoaded(state, action: PayloadAction<Partial<SettingsSliceState>>) {
      const next = { ...state, ...action.payload };
      // Documents written before the slider hold a difficulty string.
      next.difficulty = normalizeLevel(next.difficulty);
      return next;
    },
  },
});

export const {
  setHumanColor,
  setDifficulty,
  setBoardTheme,
  setThemePreference,
  settingsLoaded,
} = settingsSlice.actions;
export default settingsSlice.reducer;
