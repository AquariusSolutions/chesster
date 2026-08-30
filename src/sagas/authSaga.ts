import { eventChannel } from 'redux-saga';
import { call, fork, put, select, take, takeLatest } from 'redux-saga/effects';

import {
  AuthUser,
  clearProfilePhoto,
  configureGoogleSignIn,
  deleteAccount,
  getPrimaryProvider,
  reauthenticateWithGoogle,
  reauthenticateWithPassword,
  signInAnonymously,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
  subscribeToAuth,
  toAuthUser,
  updateProfilePhoto,
} from '@/lib/firebase-auth';
import { deleteAvatar, uploadAvatar } from '@/lib/firebase-storage';
import {
  clearAvatarModeration,
  ModerationResult,
  waitForAvatarModeration,
} from '@/lib/realtime-db';

import {
  anonymousSignInRequested,
  authError,
  authStateChanged,
  avatarRemoveRequested,
  avatarUpdateRequested,
  deleteAccountRequested,
  emailSignInRequested,
  emailSignUpRequested,
  googleSignInRequested,
  reauthRequired,
  signOutRequested,
} from '@/store/authSlice';
import type { RootState } from '@/store/index';

function errorMessage(e: unknown): string {
  const code =
    e && typeof e === 'object' && 'code' in e ? String((e as { code?: unknown }).code) : '';
  switch (code) {
    case 'auth/email-already-in-use':
    case 'auth/credential-already-in-use':
      return 'That email is already registered. Try signing in instead.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Incorrect email or password.';
    case 'auth/user-not-found':
      return 'No account found for that email.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/requires-recent-login':
      return 'Please sign in again before deleting your account.';
  }
  if (e && typeof e === 'object' && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return 'Something went wrong. Please try again.';
}

/** Bridge Firebase's auth listener into a saga-consumable channel. */
function createAuthChannel() {
  return eventChannel<{ user: ReturnType<typeof toAuthUser> }>((emit) => {
    const unsubscribe = subscribeToAuth((user) => emit({ user: toAuthUser(user) }));
    return unsubscribe;
  });
}

function* watchAuthState() {
  const channel: ReturnType<typeof createAuthChannel> = yield call(createAuthChannel);
  while (true) {
    const { user }: { user: ReturnType<typeof toAuthUser> } = yield take(channel);
    yield put(authStateChanged(user));
    if (!user) {
      // No session (first launch or after sign-out) — enter as a guest so the
      // board is always playable and games/settings still sync.
      try {
        yield call(signInAnonymously);
      } catch (e) {
        // Offline, or the Anonymous provider is disabled in the Firebase
        // console. The game still works locally; sync resumes when online.
        console.warn('[auth] guest sign-in failed:', e);
      }
    }
  }
}

// Each worker just performs the side effect; the listener above emits the
// resulting user (or the previous state on failure) and we surface errors.
function* handleEmailSignIn(action: ReturnType<typeof emailSignInRequested>) {
  try {
    yield call(signInWithEmail, action.payload.email, action.payload.password);
  } catch (e) {
    yield put(authError(errorMessage(e)));
  }
}

function* handleEmailSignUp(action: ReturnType<typeof emailSignUpRequested>) {
  try {
    yield call(signUpWithEmail, action.payload.email, action.payload.password);
  } catch (e) {
    yield put(authError(errorMessage(e)));
  }
}

function* handleGoogleSignIn() {
  try {
    // Google linking backfills the profile photo/name, which updateProfile does
    // not broadcast via onAuthStateChanged — so push the result into the store.
    const updated: AuthUser | null = yield call(signInWithGoogle);
    if (updated) yield put(authStateChanged(updated));
  } catch (e) {
    yield put(authError(errorMessage(e)));
  }
}

function* handleAnonymousSignIn() {
  try {
    yield call(signInAnonymously);
  } catch (e) {
    yield put(authError(errorMessage(e)));
  }
}

function* handleSignOut() {
  try {
    yield call(signOut);
  } catch (e) {
    yield put(authError(errorMessage(e)));
  }
}

function* handleAvatarUpdate(action: ReturnType<typeof avatarUpdateRequested>) {
  try {
    const uid: string | undefined = yield select((s: RootState) => s.auth.user?.uid);
    if (!uid) return;

    // Clear any previous verdict first so the value we wait for below is the one
    // the Cloud Function produces for *this* upload.
    yield call(clearAvatarModeration, uid);

    // Upload to Storage — this triggers the `moderateAvatar` Cloud Function,
    // which runs SafeSearch and writes a verdict to users/{uid}/avatarModeration.
    const url: string = yield call(uploadAvatar, uid, action.payload.uri);

    // Only commit the photo once it has passed moderation. Fail closed: a
    // rejection or a timeout (function/Vision unavailable) discards the upload
    // rather than risk storing or showing disallowed content.
    const verdict: ModerationResult = yield call(waitForAvatarModeration, uid);
    if (verdict.status !== 'approved') {
      yield call(deleteAvatar, uid);
      yield call(clearAvatarModeration, uid);
      yield put(
        authError(
          verdict.status === 'rejected'
            ? "That photo can't be used. Please choose a different picture."
            : "We couldn't verify that photo. Please try again.",
        ),
      );
      return;
    }

    const updated: AuthUser | null = yield call(updateProfilePhoto, url);
    if (updated) yield put(authStateChanged(updated));
    yield call(clearAvatarModeration, uid);
  } catch (e) {
    yield put(authError(errorMessage(e)));
  }
}

function* handleAvatarRemove() {
  try {
    const uid: string | undefined = yield select((s: RootState) => s.auth.user?.uid);
    if (!uid) return;
    const updated: AuthUser | null = yield call(clearProfilePhoto);
    if (updated) yield put(authStateChanged(updated));
    // Clear the profile first — a stored file nobody points at is harmless,
    // an avatar pointing at a deleted file is a broken image.
    yield call(deleteAvatar, uid);
  } catch (e) {
    yield put(authError(errorMessage(e)));
  }
}

function hasCode(e: unknown, code: string): boolean {
  return !!e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === code;
}

function* handleDeleteAccount(action: ReturnType<typeof deleteAccountRequested>) {
  const password = action.payload.password;
  // If the UI collected a password (email re-auth), refresh the session first.
  if (password) {
    try {
      yield call(reauthenticateWithPassword, password);
    } catch (e) {
      yield put(authError(errorMessage(e)));
      return;
    }
  }

  try {
    yield call(deleteAccount);
    // Firestore data + avatar are removed by the onUserDeleted Cloud Function.
    // onAuthStateChanged fires null → the guest flow signs in anonymously again.
  } catch (e) {
    if (hasCode(e, 'auth/requires-recent-login')) {
      const provider: string | null = yield call(getPrimaryProvider);
      if (provider === 'google.com') {
        // Re-auth via a fresh Google sign-in, then retry the delete.
        try {
          yield call(reauthenticateWithGoogle);
          yield call(deleteAccount);
        } catch (e2) {
          yield put(authError(errorMessage(e2)));
        }
        return;
      }
      // Email/password: ask the UI to collect the password and retry.
      yield put(reauthRequired());
      return;
    }
    yield put(authError(errorMessage(e)));
  }
}

export default function* authSaga() {
  configureGoogleSignIn();
  yield fork(watchAuthState);
  yield takeLatest(emailSignInRequested.type, handleEmailSignIn);
  yield takeLatest(emailSignUpRequested.type, handleEmailSignUp);
  yield takeLatest(googleSignInRequested.type, handleGoogleSignIn);
  yield takeLatest(anonymousSignInRequested.type, handleAnonymousSignIn);
  yield takeLatest(signOutRequested.type, handleSignOut);
  yield takeLatest(avatarUpdateRequested.type, handleAvatarUpdate);
  yield takeLatest(avatarRemoveRequested.type, handleAvatarRemove);
  yield takeLatest(deleteAccountRequested.type, handleDeleteAccount);
}
