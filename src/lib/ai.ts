/**
 * A small chess AI built on top of the pure engine in `./chess`. It searches
 * with negamax + alpha-beta pruning and a material + piece-square evaluation.
 * Difficulty is search depth. Everything here is a read-only consumer of the
 * engine — no board rules are duplicated.
 */

import {
  allLegalMoves,
  applyMove,
  Board,
  GameState,
  isInCheck,
  Move,
  PieceType,
} from './chess';

/** A level from `MIN_LEVEL` to `MAX_LEVEL`, chosen with the slider in Settings. */
export type Difficulty = number;

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 10;
export const DEFAULT_LEVEL = 5;

interface LevelConfig {
  /** Search depth. Deeper = stronger but slower to move. */
  depth: number;
  /** Centipawn noise at the root, so equal-ish moves vary between games. */
  jitter: number;
  /** Chance of skipping the search and playing a random legal move instead. */
  blunder: number;
}

/**
 * Depth alone is a poor difficulty dial: even a depth-1 alpha-beta search takes
 * every free piece and never hangs one, so low levels still felt sharp. The
 * `blunder` chance is what actually gives a human chances — it makes the engine
 * miss things the way a beginner does. Jitter only shades between near-equal
 * moves (it is below a pawn from level 4 up, so it never gives material away).
 */
const LEVELS: LevelConfig[] = [
  { depth: 1, jitter: 150, blunder: 0.55 }, // 1
  { depth: 1, jitter: 120, blunder: 0.4 }, //  2
  { depth: 2, jitter: 100, blunder: 0.28 }, // 3
  { depth: 2, jitter: 80, blunder: 0.18 }, //  4
  { depth: 2, jitter: 60, blunder: 0.1 }, //   5
  { depth: 3, jitter: 45, blunder: 0.05 }, //  6
  { depth: 3, jitter: 30, blunder: 0.02 }, //  7
  { depth: 3, jitter: 15, blunder: 0 }, //     8
  { depth: 4, jitter: 10, blunder: 0 }, //     9
  { depth: 4, jitter: 0, blunder: 0 }, //     10
];

/** Levels this app shipped before the slider replaced the three-way control. */
const LEGACY_LEVELS: Record<string, Difficulty> = { easy: 2, medium: 5, hard: 9 };

export function clampLevel(level: number): Difficulty {
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.round(level)));
}

/**
 * Coerce a persisted value to a valid level. Settings and saved games from
 * before the slider hold 'easy' | 'medium' | 'hard', so they are mapped across
 * rather than silently reset.
 */
export function normalizeLevel(value: unknown): Difficulty {
  if (typeof value === 'number' && Number.isFinite(value)) return clampLevel(value);
  if (typeof value === 'string' && value in LEGACY_LEVELS) return LEGACY_LEVELS[value];
  return DEFAULT_LEVEL;
}

/** Short name for a level, shown under the slider and in game history. */
export function levelLabel(level: Difficulty): string {
  const l = clampLevel(level);
  if (l <= 2) return 'Beginner';
  if (l <= 4) return 'Casual';
  if (l <= 6) return 'Club';
  if (l <= 8) return 'Strong';
  return 'Master';
}

const PIECE_VALUE: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// A checkmate is worth more than any material swing; the `- ply` term makes the
// search prefer mates that arrive sooner (and delay being mated).
const MATE = 1_000_000;

/**
 * Piece-square tables, from White's point of view, in this board's index
 * order (square 0 = a8 at the top, square 56 = a1 at the bottom — matching the
 * engine's top-to-bottom layout). Black reuses each table vertically mirrored,
 * which is `sq ^ 56`.
 */
const PST: Record<PieceType, number[]> = {
  p: [
      0,   0,   0,   0,   0,   0,   0,   0,
     50,  50,  50,  50,  50,  50,  50,  50,
     10,  10,  20,  30,  30,  20,  10,  10,
      5,   5,  10,  25,  25,  10,   5,   5,
      0,   0,   0,  20,  20,   0,   0,   0,
      5,  -5, -10,   0,   0, -10,  -5,   5,
      5,  10,  10, -20, -20,  10,  10,   5,
      0,   0,   0,   0,   0,   0,   0,   0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20,   0,   0,   0,   0, -20, -40,
    -30,   0,  10,  15,  15,  10,   0, -30,
    -30,   5,  15,  20,  20,  15,   5, -30,
    -30,   0,  15,  20,  20,  15,   0, -30,
    -30,   5,  10,  15,  15,  10,   5, -30,
    -40, -20,   0,   5,   5,   0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10,   0,   0,   0,   0,   0,   0, -10,
    -10,   0,   5,  10,  10,   5,   0, -10,
    -10,   5,   5,  10,  10,   5,   5, -10,
    -10,   0,  10,  10,  10,  10,   0, -10,
    -10,  10,  10,  10,  10,  10,  10, -10,
    -10,   5,   0,   0,   0,   0,   5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
      0,   0,   0,   0,   0,   0,   0,   0,
      5,  10,  10,  10,  10,  10,  10,   5,
     -5,   0,   0,   0,   0,   0,   0,  -5,
     -5,   0,   0,   0,   0,   0,   0,  -5,
     -5,   0,   0,   0,   0,   0,   0,  -5,
     -5,   0,   0,   0,   0,   0,   0,  -5,
     -5,   0,   0,   0,   0,   0,   0,  -5,
      0,   0,   0,   5,   5,   0,   0,   0,
  ],
  q: [
    -20, -10, -10,  -5,  -5, -10, -10, -20,
    -10,   0,   0,   0,   0,   0,   0, -10,
    -10,   0,   5,   5,   5,   5,   0, -10,
     -5,   0,   5,   5,   5,   5,   0,  -5,
      0,   0,   5,   5,   5,   5,   0,  -5,
    -10,   5,   5,   5,   5,   5,   0, -10,
    -10,   0,   5,   0,   0,   0,   0, -10,
    -20, -10, -10,  -5,  -5, -10, -10, -20,
  ],
  // Middlegame king: rewards staying tucked behind the pawns on the home rank.
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
     20,  20,   0,   0,   0,   0,  20,  20,
     20,  30,  10,   0,   0,  10,  30,  20,
  ],
};

/** Static evaluation of a position, in centipawns, from White's perspective. */
function evaluate(board: Board): number {
  let score = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq];
    if (!p) continue;
    const value = PIECE_VALUE[p.type] + PST[p.type][p.color === 'w' ? sq : sq ^ 56];
    score += p.color === 'w' ? value : -value;
  }
  return score;
}

/** Most-Valuable-Victim / Least-Valuable-Attacker ordering, captures first. */
function moveOrderScore(move: Move): number {
  let s = 0;
  if (move.captured) s += 10 * PIECE_VALUE[move.captured.type] - PIECE_VALUE[move.piece.type];
  if (move.promotion) s += PIECE_VALUE[move.promotion];
  return s;
}

function ordered(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => moveOrderScore(b) - moveOrderScore(a));
}

/** Negamax with alpha-beta. Returns the score from the side-to-move's view. */
function search(state: GameState, depth: number, alpha: number, beta: number, ply: number): number {
  const moves = allLegalMoves(state);
  if (moves.length === 0) {
    // No legal move: checkmate (bad for us) or stalemate (equal).
    return isInCheck(state, state.turn) ? -(MATE - ply) : 0;
  }
  if (depth === 0) {
    return state.turn === 'w' ? evaluate(state.board) : -evaluate(state.board);
  }

  let best = -Infinity;
  for (const move of ordered(moves)) {
    const score = -search(applyMove(state, move), depth - 1, -beta, -alpha, ply + 1);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break; // opponent already has a better line elsewhere
  }
  return best;
}

/**
 * Pick a move for the side to move at the given search `depth`. `jitter` adds a
 * little random noise so equal-ish moves vary between games. Returns null when
 * there are no legal moves (game already over).
 */
export function bestMove(state: GameState, depth: number, jitter = 0): Move | null {
  const moves = ordered(allLegalMoves(state));
  if (moves.length === 0) return null;

  let chosen = moves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  for (const move of moves) {
    const score = -search(applyMove(state, move), depth - 1, -Infinity, -alpha, 1);
    const ranked = score + (jitter > 0 ? Math.random() * jitter : 0);
    if (ranked > bestScore) {
      bestScore = ranked;
      chosen = move;
    }
    if (score > alpha) alpha = score; // prune with the true score, not the jittered one
  }
  return chosen;
}

/** Convenience wrapper: choose a move for a difficulty level. */
export function chooseMove(state: GameState, difficulty: Difficulty): Move | null {
  const { depth, jitter, blunder } = LEVELS[normalizeLevel(difficulty) - 1];

  if (blunder > 0 && Math.random() < blunder) {
    const moves = allLegalMoves(state);
    if (moves.length === 0) return null;
    return moves[Math.floor(Math.random() * moves.length)];
  }
  return bestMove(state, depth, jitter);
}
