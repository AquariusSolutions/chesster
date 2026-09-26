/**
 * Native Google sign-in via @react-native-google-signin. The web counterpart
 * (google-signin.web.ts) uses expo-auth-session, since this library's web
 * support is sponsor-only.
 */
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { GOOGLE_WEB_CLIENT_ID } from '@/constants/google';

export interface GoogleTokens {
  idToken: string;
  accessToken?: string;
}

export function configureGoogleSignIn() {
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
}

/** Runs the Google account picker; resolves null if the user cancels. */
export async function getGoogleTokens(): Promise<GoogleTokens | null> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken;
  if (!idToken) return null;
  // Fetched explicitly: RN Firebase bridges a missing access token to native as
  // an empty string, which Android's GoogleAuthCredential rejects.
  const { accessToken } = await GoogleSignin.getTokens();
  return { idToken, accessToken };
}

export async function googleSignOut() {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google — ignore.
  }
}
