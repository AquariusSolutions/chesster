import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { AuthUser } from '@/lib/firebase-auth';

export interface AuthSliceState {
  user: AuthUser | null;
  /** True until the first onAuthStateChanged fires, so we can hold the splash. */
  initializing: boolean;
  status: 'idle' | 'loading';
  /** A profile photo upload is in progress. */
  photoUpdating: boolean;
  /** Deleting the account needs a fresh password (email users, stale session). */
  reauthNeeded: boolean;
  error: string | null;
}

const initial: AuthSliceState = {
  user: null,
  initializing: true,
  status: 'idle',
  photoUpdating: false,
  reauthNeeded: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState: initial,
  reducers: {
    // Intents — handled by the auth saga (the controller).
    emailSignInRequested: {
      reducer(state) {
        state.status = 'loading';
        state.error = null;
      },
      prepare(email: string, password: string) {
        return { payload: { email, password } };
      },
    },
    emailSignUpRequested: {
      reducer(state) {
        state.status = 'loading';
        state.error = null;
      },
      prepare(email: string, password: string) {
        return { payload: { email, password } };
      },
    },
    googleSignInRequested(state) {
      state.status = 'loading';
      state.error = null;
    },
    anonymousSignInRequested(state) {
      state.status = 'loading';
      state.error = null;
    },
    signOutRequested(state) {
      state.status = 'loading';
    },
    deleteAccountRequested: {
      reducer(state) {
        state.status = 'loading';
        state.error = null;
        state.reauthNeeded = false;
      },
      prepare(password?: string) {
        return { payload: { password } };
      },
    },
    reauthRequired(state) {
      state.status = 'idle';
      state.reauthNeeded = true;
    },
    reauthCancelled(state) {
      state.status = 'idle';
      state.reauthNeeded = false;
    },
    avatarUpdateRequested: {
      reducer(state) {
        state.photoUpdating = true;
        state.error = null;
      },
      prepare(uri: string) {
        return { payload: { uri } };
      },
    },
    avatarRemoveRequested(state) {
      state.photoUpdating = true;
      state.error = null;
    },

    // Results.
    authError(state, action: PayloadAction<string>) {
      state.status = 'idle';
      state.photoUpdating = false;
      state.error = action.payload;
    },
    authStateChanged(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
      state.initializing = false;
      state.status = 'idle';
      state.photoUpdating = false;
      state.reauthNeeded = false;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
});

export const {
  emailSignInRequested,
  emailSignUpRequested,
  googleSignInRequested,
  anonymousSignInRequested,
  signOutRequested,
  deleteAccountRequested,
  reauthRequired,
  reauthCancelled,
  avatarUpdateRequested,
  avatarRemoveRequested,
  authError,
  authStateChanged,
  clearAuthError,
} = authSlice.actions;

export default authSlice.reducer;
