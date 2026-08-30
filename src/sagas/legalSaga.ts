import { call, select, takeLatest } from 'redux-saga/effects';

import { saveTermsAcceptance } from '@/lib/realtime-db';

import { authStateChanged } from '@/store/authSlice';
import { termsAccepted } from '@/store/legalSlice';
import type { RootState } from '@/store/index';

/**
 * Mirror the locally-recorded acceptance to `users/{uid}/legal` so it is linked
 * to the account, not just the device. Runs both when the user accepts and when
 * the auth state changes (e.g. a guest who already accepted then signs in, so
 * their acceptance follows them to the account record).
 */
function* syncAcceptance() {
  const state: RootState = yield select();
  const uid = state.auth.user?.uid;
  const { acceptedVersion, acceptedAt } = state.legal;
  if (!uid || acceptedVersion == null || acceptedAt == null) return;
  try {
    yield call(saveTermsAcceptance, uid, {
      version: acceptedVersion,
      acceptedAt,
    });
  } catch {
    // Offline or permission error — the local acceptance still gates the UI,
    // and this re-runs on the next auth change.
  }
}

export default function* legalSaga() {
  yield takeLatest(termsAccepted.type, syncAcceptance);
  yield takeLatest(authStateChanged.type, syncAcceptance);
}
