import { call, debounce, put, select, takeLatest } from 'redux-saga/effects';

import { loadUserSettings, saveUserSettings } from '@/lib/realtime-db';

import { authStateChanged } from '@/store/authSlice';
import {
  setBoardTheme,
  setDifficulty,
  setHumanColor,
  setThemePreference,
  settingsLoaded,
  SettingsSliceState,
} from '@/store/settingsSlice';
import type { RootState } from '@/store/index';

/** Push the current settings to Firestore (debounced) whenever they change. */
function* syncSettings() {
  const state: RootState = yield select();
  const uid = state.auth.user?.uid;
  if (!uid) return;
  try {
    yield call(saveUserSettings, uid, state.settings);
  } catch {
    // Offline or permission error — local settings still apply.
  }
}

/** On sign-in, pull the user's saved settings from Firestore into the store. */
function* loadSettings(action: ReturnType<typeof authStateChanged>) {
  const user = action.payload;
  if (!user) return;
  try {
    const remote: Partial<SettingsSliceState> | null = yield call(
      loadUserSettings,
      user.uid,
    );
    if (remote) yield put(settingsLoaded(remote));
  } catch {
    // Ignore — keep whatever settings we already have.
  }
}

export default function* settingsSaga() {
  yield debounce(
    800,
    [
      setHumanColor.type,
      setDifficulty.type,
      setBoardTheme.type,
      setThemePreference.type,
    ],
    syncSettings,
  );
  yield takeLatest(authStateChanged.type, loadSettings);
}
