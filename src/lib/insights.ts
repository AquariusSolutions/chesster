/**
 * Derived, read-only stats over a user's saved games: their win/draw/loss
 * record and a "Chess IQ" rating.
 *
 * Nothing here is persisted — everything is recomputed from the same replayable
 * game list the history screen already loads, so the numbers can never drift
 * out of sync with what the user sees in the list.
 */
import { normalizeLevel } from '@/lib/ai';
import { SavedGame, UNFINISHED } from '@/lib/realtime-db';

export type Outcome = 'win' | 'loss' | 'draw' | 'playing';

/**
 * Classify a game from the human's point of view. A checkmate belongs to
 * whoever was *not* to move when it landed: at mate the side to move is the one
 * mated, and the side to move is determined by move parity (white starts).
 */
export function gameOutcome(game: SavedGame): Outcome {
  if (game.result === UNFINISHED) return 'playing';
  if (game.result === 'checkmate') {
    const loser = game.moves.length % 2 === 0 ? 'w' : 'b';
    return loser === game.humanColor ? 'loss' : 'win';
  }
  // stalemate, draw, insufficient material, … — anything terminal but not mate.
  return 'draw';
}

export interface Record {
  wins: number;
  draws: number;
  losses: number;
  playing: number;
  /** Games with a terminal result — the denominator for the record. */
  finished: number;
}

export function computeRecord(games: SavedGame[]): Record {
  const record: Record = { wins: 0, draws: 0, losses: 0, playing: 0, finished: 0 };
  for (const game of games) {
    switch (gameOutcome(game)) {
      case 'win':
        record.wins++;
        break;
      case 'loss':
        record.losses++;
        break;
      case 'draw':
        record.draws++;
        break;
      case 'playing':
        record.playing++;
        break;
    }
  }
  record.finished = record.wins + record.draws + record.losses;
  return record;
}

export interface ChessIq {
  /** IQ-style score. `null` until at least one game has finished. */
  score: number | null;
  /** Short descriptor for the score band, e.g. "Sharp". */
  tier: string;
  /** True while too few games have finished for a stable estimate. */
  provisional: boolean;
}

/** Below this many finished games the score is shown but flagged provisional. */
const STABLE_SAMPLE = 5;

/**
 * A single game's contribution, 0–100, rewarding results against tougher
 * opponents. Levels run 1–10; a win over level 10 is worth the full 100, a win
 * over level 1 is worth 55. Losses still earn a little for the difficulty faced
 * so that climbing the ladder is never punished into a lower score than
 * farming the easiest bot.
 */
function gamePoints(game: SavedGame, outcome: Exclude<Outcome, 'playing'>): number {
  const strength = normalizeLevel(game.difficulty) / 10; // 0.1 … 1.0
  switch (outcome) {
    case 'win':
      return 50 + 50 * strength;
    case 'draw':
      return 25 + 25 * strength;
    case 'loss':
      return 20 * strength;
  }
}

function tierFor(score: number): string {
  if (score < 90) return 'Novice';
  if (score < 105) return 'Casual';
  if (score < 120) return 'Sharp';
  if (score < 140) return 'Strong';
  return 'Master';
}

/**
 * Fold the finished games into an IQ-style score centred near 100. The average
 * per-game points (2–100) are mapped onto roughly 80–160 so the number reads
 * like a familiar IQ figure while still being driven purely by how the user
 * actually plays: winning more, and winning against stronger bots, moves it up.
 */
export function computeChessIq(games: SavedGame[]): ChessIq {
  const finished = games
    .map((game) => ({ game, outcome: gameOutcome(game) }))
    .filter(
      (g): g is { game: SavedGame; outcome: Exclude<Outcome, 'playing'> } =>
        g.outcome !== 'playing',
    );

  if (finished.length === 0) {
    return { score: null, tier: '—', provisional: true };
  }

  const avgPoints =
    finished.reduce((sum, g) => sum + gamePoints(g.game, g.outcome), 0) /
    finished.length;

  const score = Math.round(80 + avgPoints * 0.8);
  return {
    score,
    tier: tierFor(score),
    provisional: finished.length < STABLE_SAMPLE,
  };
}
