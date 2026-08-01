/**
 * Cloud persistence (Firebase Realtime Database, modular API). Everything a
 * user owns hangs off `users/{uid}`:
 *
 *   users/{uid}/settings      — preferences
 *   users/{uid}/games/{id}    — every game, finished or not
 *   users/{uid}/currentGameId — which of those is being played right now
 *
 * Games are stored as a replayable move list rather than board snapshots, so an
 * unfinished one can be picked up again later or on another device. Keeping
 * finished and unfinished games in one place means abandoning a game is just a
 * pointer move — nothing is copied between nodes and nothing can be lost.
 *
 * Native-only — requires the development build.
 */
import {
  get,
  getDatabase,
  limitToLast,
  orderByChild,
  query,
  ref,
  remove,
  set,
} from '@react-native-firebase/database';

import { Move, PieceColor, PlayedMove } from '@/lib/chess';
import { SettingsSliceState } from '@/store/settingsSlice';

/** `SavedGame.result` for a game that is still playable. */
export const UNFINISHED = 'unfinished';

export interface SavedGame {
  id: string;
  /** A terminal status ("checkmate", "stalemate", …) or `UNFINISHED`. */
  result: string;
  /** Replayable move list — the engine re-derives everything else. */
  moves: PlayedMove[];
  humanColor: PieceColor;
  /** Level 1–10. */
  difficulty: number | string;
  /** Seconds the game has lasted so far. */
  elapsed: number;
  /** Unix ms when the game started; used for ordering. */
  createdAt: number;
}

/**
 * Reduce a move to the wire format. Optional fields are omitted rather than set
 * to `undefined`, which the Realtime Database rejects outright.
 */
export function toPlayedMove(move: Move): PlayedMove {
  return move.promotion
    ? { from: move.from, to: move.to, promotion: move.promotion }
    : { from: move.from, to: move.to };
}

const userRef = (uid: string, path: string) => ref(getDatabase(), `users/${uid}/${path}`);

/** An empty list round-trips as null — the database has no empty arrays. */
const withMoves = (game: SavedGame): SavedGame => ({ ...game, moves: game.moves ?? [] });

export async function saveUserSettings(uid: string, settings: SettingsSliceState) {
  await set(userRef(uid, 'settings'), settings);
}

export async function loadUserSettings(
  uid: string,
): Promise<Partial<SettingsSliceState> | null> {
  const snap = await get(userRef(uid, 'settings'));
  if (!snap.exists()) return null;
  return snap.val() as Partial<SettingsSliceState>;
}

export async function saveGame(uid: string, game: SavedGame) {
  await set(userRef(uid, `games/${game.id}`), game);
}

export async function loadGame(uid: string, id: string): Promise<SavedGame | null> {
  const snap = await get(userRef(uid, `games/${id}`));
  if (!snap.exists()) return null;
  return withMoves(snap.val() as SavedGame);
}

export async function loadGames(uid: string): Promise<SavedGame[]> {
  // The Realtime Database only sorts ascending, so take the newest 50 off the
  // end of the range and flip them into newest-first order.
  const snap = await get(
    query(userRef(uid, 'games'), orderByChild('createdAt'), limitToLast(50)),
  );
  const games: SavedGame[] = [];
  snap.forEach((child) => {
    games.push(withMoves(child.val() as SavedGame));
    return undefined;
  });
  return games.reverse();
}

export async function deleteGame(uid: string, id: string) {
  await remove(userRef(uid, `games/${id}`));
}

export async function saveCurrentGameId(uid: string, id: string) {
  await set(userRef(uid, 'currentGameId'), id);
}

export async function loadCurrentGameId(uid: string): Promise<string | null> {
  const snap = await get(userRef(uid, 'currentGameId'));
  return snap.exists() ? (snap.val() as string) : null;
}
