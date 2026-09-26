/**
 * Web Google sign-in via expo-auth-session: opens Google's OAuth popup and
 * returns an ID token (implicit flow), which Firebase exchanges for a
 * credential exactly as on native.
 *
 * The popup comes back to the site origin, where the root layout calls
 * WebBrowser.maybeCompleteAuthSession() to hand the result to this window.
 * The origin must be listed under both "Authorized JavaScript origins" and
 * "Authorized redirect URIs" on the web OAuth client in Google Cloud Console.
 */
import { AuthRequest, ResponseType, type AuthSessionResult } from 'expo-auth-session';
import * as Crypto from 'expo-crypto';

import { GOOGLE_WEB_CLIENT_ID } from '@/constants/google';

export interface GoogleTokens {
  idToken: string;
  accessToken?: string;
}

const discovery = { authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth' };

// Requests are single-use (fresh state + nonce). One is built ahead of time so
// the popup opens right after the click instead of after async URL building,
// which browsers may treat as an unsolicited popup and block.
let pending: Promise<AuthRequest> | null = null;

function prepareRequest(): Promise<AuthRequest> {
  const request = new AuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri: window.location.origin,
    responseType: ResponseType.IdToken,
    scopes: ['openid', 'email', 'profile'],
    usePKCE: false,
    extraParams: { nonce: Crypto.randomUUID(), prompt: 'select_account' },
  });
  pending = request.makeAuthUrlAsync(discovery).then(() => request);
  return pending;
}

export function configureGoogleSignIn() {
  // Skipped during static rendering (expo export), where there is no window.
  if (typeof window !== 'undefined') prepareRequest();
}

/** Opens the Google popup; resolves null if the user closes it. */
export async function getGoogleTokens(): Promise<GoogleTokens | null> {
  const request = await (pending ?? prepareRequest());
  pending = null;
  let result: AuthSessionResult;
  try {
    result = await request.promptAsync(discovery);
  } finally {
    prepareRequest();
  }
  if (result.type === 'error') {
    throw new Error(result.params.error_description ?? result.error?.message ?? 'Google sign-in failed.');
  }
  if (result.type !== 'success' || !result.params.id_token) return null;
  return { idToken: result.params.id_token };
}

export async function googleSignOut() {
  // The popup flow keeps no local Google session to clear.
}
