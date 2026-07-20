import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { BoardThemeKey } from '@/constants/board-themes';
import { Difficulty } from '@/lib/ai';
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
  difficulty: 'medium',
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
      state.difficulty = action.payload;
    },
    setBoardTheme(state, action: PayloadAction<BoardThemeKey>) {
      state.boardTheme = action.payload;
    },
    setThemePreference(state, action: PayloadAction<ThemePreference>) {
      state.themePreference = action.payload;
    },
    /** Bulk-apply settings loaded from Firestore (only provided keys). */
    settingsLoaded(state, action: PayloadAction<Partial<SettingsSliceState>>) {
      return { ...state, ...action.payload };
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
