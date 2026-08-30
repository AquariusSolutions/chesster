import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Records the user's acceptance of the Terms & Conditions. This slice is
 * persisted to the device (AsyncStorage, see the persist whitelist in
 * `store/index.ts`) so the gate is only shown once per version, and it is also
 * mirrored to `users/{uid}/legal` by the legal saga so acceptance is linked to
 * the signed-in account as well as the phone.
 */
export interface LegalSliceState {
  /** The TERMS_VERSION the user accepted, or null if they never have. */
  acceptedVersion: number | null;
  /** Unix ms when acceptance was recorded on this device. */
  acceptedAt: number | null;
}

const initial: LegalSliceState = {
  acceptedVersion: null,
  acceptedAt: null,
};

const legalSlice = createSlice({
  name: 'legal',
  initialState: initial,
  reducers: {
    termsAccepted: {
      reducer(state, action: PayloadAction<{ version: number }>) {
        state.acceptedVersion = action.payload.version;
        state.acceptedAt = Date.now();
      },
      prepare(version: number) {
        return { payload: { version } };
      },
    },
  },
});

export const { termsAccepted } = legalSlice.actions;
export default legalSlice.reducer;
