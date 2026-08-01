/**
 * Thin wrapper around @react-native-firebase/auth (modular API) plus Google
 * sign-in. Keeps all native-Firebase access in one place so the rest of the app
 * (store, sagas, screens) depends only on plain data and these functions.
 *
 * NOTE: these require a development build — they do not work in Expo Go or on web.
 */
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  getAuth,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInAnonymously as fbSignInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
} from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

function hasErrorCode(e: unknown, code: string): boolean {
  return (
    !!e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === code
  );
}

// Web OAuth client id (client_type 3) from google-services.json — required so
// Google sign-in returns an ID token Firebase can exchange for a credential.
const WEB_CLIENT_ID = '346188478020-5l0vq52pfi35jahkkrfuguqms8d9p335.apps.googleusercontent.com';

/** The fields we read off a Firebase user (structurally compatible with both
 *  the modular and namespaced RN Firebase user types). */
interface FirebaseUserLike {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

/** Plain, serializable projection of a Firebase user for the Redux store. */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

export function toAuthUser(user: FirebaseUserLike | null): AuthUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    isAnonymous: user.isAnonymous,
  };
}

export function configureGoogleSignIn() {
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
}

/** Subscribe to auth changes; returns an unsubscribe function. */
export function subscribeToAuth(callback: (user: FirebaseUserLike | null) => void) {
  return onAuthStateChanged(getAuth(), callback);
}

export function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(getAuth(), email, password);
}

export function signUpWithEmail(email: string, password: string) {
  const auth = getAuth();
  const current = auth.currentUser;
  // Upgrade the guest in place so their games/settings (keyed by uid) carry over.
  if (current?.isAnonymous) {
    return linkWithCredential(current, EmailAuthProvider.credential(email, password));
  }
  return createUserWithEmailAndPassword(auth, email, password);
}

export function signInAnonymously() {
  return fbSignInAnonymously(getAuth());
}

/**
 * Runs the Google sign-in flow and returns a Firebase credential.
 *
 * The access token is fetched explicitly rather than left out: RN Firebase
 * bridges a missing access token to native as an empty string, and Android's
 * GoogleAuthCredential rejects an empty one (it only accepts absent or
 * non-empty), failing with "accessToken cannot be empty".
 */
async function getGoogleCredential() {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken;
  if (!idToken) throw new Error('Google sign-in was cancelled.');
  const { accessToken } = await GoogleSignin.getTokens();
  return GoogleAuthProvider.credential(idToken, accessToken);
}

export async function signInWithGoogle() {
  const credential = await getGoogleCredential();

  const auth = getAuth();
  const current = auth.currentUser;

  if (current?.isAnonymous) {
    try {
      // New Google account: upgrade the guest in place, keeping their uid/data.
      return await linkWithCredential(current, credential);
    } catch (e) {
      // The Google account already exists — fall through and sign into it
      // (a separate account, so guest data stays with the guest).
      if (!hasErrorCode(e, 'auth/credential-already-in-use')) throw e;
    }
  }
  return signInWithCredential(auth, credential);
}

export async function signOut() {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google — ignore.
  }
  await fbSignOut(getAuth());
}

/** Set the current user's photo and return the refreshed user projection. */
export async function updateProfilePhoto(photoURL: string): Promise<AuthUser | null> {
  const auth = getAuth();
  const current = auth.currentUser;
  if (!current) return null;
  await updateProfile(current, { photoURL });
  // updateProfile swaps a fresh User onto the auth instance rather than
  // mutating the one captured above, so re-read it — the old reference still
  // carries the old photo. It also emits `onUserChanged`, not
  // `onAuthStateChanged`, so our listener won't report this either.
  return toAuthUser(auth.currentUser);
}

/** Clear the current user's photo so the UI falls back to their initial. */
export async function clearProfilePhoto(): Promise<AuthUser | null> {
  const auth = getAuth();
  const current = auth.currentUser;
  if (!current) return null;
  await updateProfile(current, { photoURL: null });
  return toAuthUser(auth.currentUser);
}

export async function deleteAccount(): Promise<void> {
  const current = getAuth().currentUser;
  if (current) await deleteUser(current);
}

/** The current user's primary sign-in provider ('password', 'google.com', 'anonymous'). */
export function getPrimaryProvider(): string | null {
  const current = getAuth().currentUser;
  if (!current) return null;
  if (current.isAnonymous) return 'anonymous';
  return current.providerData[0]?.providerId ?? null;
}

/** Re-authenticate an email/password user (needed for sensitive ops like delete). */
export async function reauthenticateWithPassword(password: string): Promise<void> {
  const current = getAuth().currentUser;
  if (!current?.email) throw new Error('No email is associated with this account.');
  await reauthenticateWithCredential(
    current,
    EmailAuthProvider.credential(current.email, password),
  );
}

/** Re-authenticate a Google user via a fresh Google sign-in. */
export async function reauthenticateWithGoogle(): Promise<void> {
  const credential = await getGoogleCredential();
  const current = getAuth().currentUser;
  if (!current) throw new Error('Not signed in.');
  await reauthenticateWithCredential(current, credential);
}
