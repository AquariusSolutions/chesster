/**
 * Cloud persistence (Cloud Firestore, modular API). Stores each user's settings
 * on their user document and finished games in a `games` subcollection.
 *
 * Layout: users/{uid} = { settings }, users/{uid}/games/{gameId} = SavedGame.
 * Native-only — requires the development build.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  setDoc,
} from '@react-native-firebase/firestore';

import { SettingsSliceState } from '@/store/settingsSlice';

export interface SavedGame {
  id: string;
  /** Terminal status, e.g. "checkmate" or "draw-stalemate". */
  result: string;
  /** Move list in standard algebraic notation. */
  moves: string[];
  humanColor: 'w' | 'b';
  difficulty: string;
  /** Seconds the game lasted. */
  elapsed: number;
  /** Unix ms; used for ordering. */
  createdAt: number;
}

export async function saveUserSettings(uid: string, settings: SettingsSliceState) {
  await setDoc(doc(getFirestore(), 'users', uid), { settings }, { merge: true });
}

export async function loadUserSettings(
  uid: string,
): Promise<Partial<SettingsSliceState> | null> {
  const snap = await getDoc(doc(getFirestore(), 'users', uid));
  if (!snap.exists()) return null;
  return (snap.data()?.settings as Partial<SettingsSliceState>) ?? null;
}

export async function saveGame(uid: string, game: SavedGame) {
  await setDoc(doc(getFirestore(), 'users', uid, 'games', game.id), game);
}

export async function loadGames(uid: string): Promise<SavedGame[]> {
  const q = query(
    collection(getFirestore(), 'users', uid, 'games'),
    orderBy('createdAt', 'desc'),
    limit(50),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as SavedGame);
}
