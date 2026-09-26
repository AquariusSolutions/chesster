/**
 * Web: RN Firebase falls back to the Firebase JS SDK, which has no native
 * config file to read — the default app must be created explicitly before any
 * getAuth()/getDatabase()/getStorage() call.
 */
import { getApps, initializeApp } from '@react-native-firebase/app';

// RN Firebase's web layer schedules events with setImmediate, which React
// Native provides but browsers do not.
if (typeof globalThis.setImmediate === 'undefined') {
  (globalThis as { setImmediate?: unknown }).setImmediate = (
    fn: (...args: unknown[]) => void,
    ...args: unknown[]
  ) => setTimeout(fn, 0, ...args);
}

// Firebase web app "Chesster" (1:346188478020:web:eabf2c234a19a8b3a3ae11).
// These values are public client identifiers, not secrets.
const WEB_CONFIG = {
  apiKey: 'AIzaSyDnVfupDDLGqQWrO5G2m8mqIMivnDCLIcE',
  authDomain: 'chess-solutions-f8a5b.firebaseapp.com',
  databaseURL: 'https://chess-solutions-f8a5b-default-rtdb.firebaseio.com',
  projectId: 'chess-solutions-f8a5b',
  storageBucket: 'chess-solutions-f8a5b.firebasestorage.app',
  messagingSenderId: '346188478020',
  appId: '1:346188478020:web:eabf2c234a19a8b3a3ae11',
};

export async function initFirebase(): Promise<void> {
  if (getApps().length === 0) {
    await initializeApp(WEB_CONFIG);
  }
}
