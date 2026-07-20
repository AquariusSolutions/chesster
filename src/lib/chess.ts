/**
 * Pure chess engine: board representation, move generation, and full rules
 * (castling, en passant, promotion, check, checkmate, stalemate, 50-move
 * rule, and insufficient material). No UI or platform dependencies.
 *
 * Board is a flat array of 64 squares, index = row * 8 + col, where row 0 is
 * rank 8 (black's home rank) so the array reads top-to-bottom like a diagram.
 */

export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface Piece {
  color: PieceColor;
  type: PieceType;
}

export type Board = (Piece | null)[];

export interface Move {
  from: number;
  to: number;
  piece: Piece;
  captured?: Piece;
  promotion?: PieceType;
  isEnPassant?: boolean;
  isCastle?: 'k' | 'q';
  isDoublePush?: boolean;
}

export interface CastlingRights {
  wk: boolean;
  wq: boolean;
  bk: boolean;
  bq: boolean;
}

export interface GameState {
  board: Board;
  turn: PieceColor;
  castling: CastlingRights;
  /** Square a pawn may capture onto en passant, or null. */
  epSquare: number | null;
  /** Half-moves since the last pawn move or capture (for the 50-move rule). */
  halfmoveClock: number;
  fullmove: number;
}

export type GameStatus =
  | 'playing'
  | 'check'
  | 'checkmate'
  | 'stalemate'
  | 'draw-fifty-moves'
  | 'draw-insufficient-material'
  | 'draw-repetition';

export const rowOf = (sq: number) => Math.floor(sq / 8);
export const colOf = (sq: number) => sq % 8;

export function squareName(sq: number): string {
  return `${'abcdefgh'[colOf(sq)]}${8 - rowOf(sq)}`;
}

/**
 * A key identifying a position for threefold-repetition detection: piece
 * placement, side to move, castling rights, and the en passant target. Two
 * positions with the same key are the "same position" under FIDE rules.
 */
export function positionKey(state: GameState): string {
  let placement = '';
  for (let sq = 0; sq < 64; sq++) {
    const p = state.board[sq];
    placement += p ? (p.color === 'w' ? p.type.toUpperCase() : p.type) : '.';
  }
  const c = state.castling;
  const rights = `${c.wk ? 'K' : ''}${c.wq ? 'Q' : ''}${c.bk ? 'k' : ''}${c.bq ? 'q' : ''}`;
  return `${placement} ${state.turn} ${rights || '-'} ${state.epSquare ?? '-'}`;
}

const BACK_RANK: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];

export function initialState(): GameState {
  const board: Board = new Array(64).fill(null);
  for (let col = 0; col < 8; col++) {
    board[col] = { color: 'b', type: BACK_RANK[col] };
    board[8 + col] = { color: 'b', type: 'p' };
    board[48 + col] = { color: 'w', type: 'p' };
    board[56 + col] = { color: 'w', type: BACK_RANK[col] };
  }
  return {
    board,
    turn: 'w',
    castling: { wk: true, wq: true, bk: true, bq: true },
    epSquare: null,
    halfmoveClock: 0,
    fullmove: 1,
  };
}

const KNIGHT_OFFSETS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];
const KING_OFFSETS = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1],
  [0, 1], [1, -1], [1, 0], [1, 1],
];
const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function onBoard(row: number, col: number) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

/** Is `sq` attacked by any piece of `byColor`? */
export function isSquareAttacked(board: Board, sq: number, byColor: PieceColor): boolean {
  const row = rowOf(sq);
  const col = colOf(sq);

  // Pawn attacks: a white pawn attacks upward (toward row 0).
  const pawnRow = byColor === 'w' ? row + 1 : row - 1;
  for (const dc of [-1, 1]) {
    if (onBoard(pawnRow, col + dc)) {
      const p = board[pawnRow * 8 + col + dc];
      if (p && p.color === byColor && p.type === 'p') return true;
    }
  }

  for (const [dr, dc] of KNIGHT_OFFSETS) {
    if (onBoard(row + dr, col + dc)) {
      const p = board[(row + dr) * 8 + col + dc];
      if (p && p.color === byColor && p.type === 'n') return true;
    }
  }

  for (const [dr, dc] of KING_OFFSETS) {
    if (onBoard(row + dr, col + dc)) {
      const p = board[(row + dr) * 8 + col + dc];
      if (p && p.color === byColor && p.type === 'k') return true;
    }
  }

  for (const [dr, dc] of BISHOP_DIRS) {
    for (let r = row + dr, c = col + dc; onBoard(r, c); r += dr, c += dc) {
      const p = board[r * 8 + c];
      if (!p) continue;
      if (p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
      break;
    }
  }

  for (const [dr, dc] of ROOK_DIRS) {
    for (let r = row + dr, c = col + dc; onBoard(r, c); r += dr, c += dc) {
      const p = board[r * 8 + c];
      if (!p) continue;
      if (p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
      break;
    }
  }

  return false;
}

export function findKing(board: Board, color: PieceColor): number {
  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq];
    if (p && p.type === 'k' && p.color === color) return sq;
  }
  return -1;
}

export function isInCheck(state: GameState, color: PieceColor): boolean {
  const kingSq = findKing(state.board, color);
  return kingSq >= 0 && isSquareAttacked(state.board, kingSq, color === 'w' ? 'b' : 'w');
}

function pseudoLegalMovesFrom(state: GameState, from: number): Move[] {
  const { board, epSquare, castling } = state;
  const piece = board[from];
  if (!piece) return [];
  const moves: Move[] = [];
  const row = rowOf(from);
  const col = colOf(from);
  const enemy: PieceColor = piece.color === 'w' ? 'b' : 'w';

  const push = (to: number, extra: Partial<Move> = {}) => {
    moves.push({ from, to, piece, captured: board[to] ?? undefined, ...extra });
  };

  if (piece.type === 'p') {
    const dir = piece.color === 'w' ? -1 : 1;
    const startRow = piece.color === 'w' ? 6 : 1;
    const promoRow = piece.color === 'w' ? 0 : 7;

    const pushPawn = (to: number, extra: Partial<Move> = {}) => {
      if (rowOf(to) === promoRow) {
        for (const promotion of ['q', 'r', 'b', 'n'] as PieceType[]) {
          push(to, { ...extra, promotion });
        }
      } else {
        push(to, extra);
      }
    };

    const oneAhead = (row + dir) * 8 + col;
    if (onBoard(row + dir, col) && !board[oneAhead]) {
      pushPawn(oneAhead);
      const twoAhead = (row + 2 * dir) * 8 + col;
      if (row === startRow && !board[twoAhead]) {
        push(twoAhead, { isDoublePush: true });
      }
    }
    for (const dc of [-1, 1]) {
      if (!onBoard(row + dir, col + dc)) continue;
      const to = (row + dir) * 8 + col + dc;
      const target = board[to];
      if (target && target.color === enemy) {
        pushPawn(to);
      } else if (to === epSquare) {
        const capturedSq = to - dir * 8;
        moves.push({
          from,
          to,
          piece,
          captured: board[capturedSq] ?? undefined,
          isEnPassant: true,
        });
      }
    }
    return moves;
  }

  if (piece.type === 'n' || piece.type === 'k') {
    const offsets = piece.type === 'n' ? KNIGHT_OFFSETS : KING_OFFSETS;
    for (const [dr, dc] of offsets) {
      if (!onBoard(row + dr, col + dc)) continue;
      const to = (row + dr) * 8 + col + dc;
      const target = board[to];
      if (!target || target.color === enemy) push(to);
    }
    if (piece.type === 'k') {
      // Castling: rights intact, path empty, and the king's start/passing/
      // landing squares not attacked.
      const home = piece.color === 'w' ? 56 : 0;
      const rights = piece.color === 'w' ? [castling.wk, castling.wq] : [castling.bk, castling.bq];
      const clearOfAttack = (squares: number[]) =>
        squares.every((sq) => !isSquareAttacked(board, sq, enemy));
      if (
        rights[0] &&
        !board[home + 5] && !board[home + 6] &&
        clearOfAttack([home + 4, home + 5, home + 6])
      ) {
        push(home + 6, { isCastle: 'k' });
      }
      if (
        rights[1] &&
        !board[home + 1] && !board[home + 2] && !board[home + 3] &&
        clearOfAttack([home + 4, home + 3, home + 2])
      ) {
        push(home + 2, { isCastle: 'q' });
      }
    }
    return moves;
  }

  const dirs =
    piece.type === 'b' ? BISHOP_DIRS : piece.type === 'r' ? ROOK_DIRS : [...BISHOP_DIRS, ...ROOK_DIRS];
  for (const [dr, dc] of dirs) {
    for (let r = row + dr, c = col + dc; onBoard(r, c); r += dr, c += dc) {
      const to = r * 8 + c;
      const target = board[to];
      if (!target) {
        push(to);
      } else {
        if (target.color === enemy) push(to);
        break;
      }
    }
  }
  return moves;
}

/** Apply a move and return the new state. Does not validate legality. */
export function applyMove(state: GameState, move: Move): GameState {
  const board = state.board.slice();
  const { from, to, piece } = move;

  board[to] = move.promotion ? { color: piece.color, type: move.promotion } : piece;
  board[from] = null;

  if (move.isEnPassant) {
    const dir = piece.color === 'w' ? -1 : 1;
    board[to - dir * 8] = null;
  }
  if (move.isCastle) {
    const home = piece.color === 'w' ? 56 : 0;
    if (move.isCastle === 'k') {
      board[home + 5] = board[home + 7];
      board[home + 7] = null;
    } else {
      board[home + 3] = board[home];
      board[home] = null;
    }
  }

  const castling = { ...state.castling };
  if (piece.type === 'k') {
    if (piece.color === 'w') castling.wk = castling.wq = false;
    else castling.bk = castling.bq = false;
  }
  // Any move from or to a rook's home corner voids that side's right.
  for (const sq of [from, to]) {
    if (sq === 63) castling.wk = false;
    if (sq === 56) castling.wq = false;
    if (sq === 7) castling.bk = false;
    if (sq === 0) castling.bq = false;
  }

  const isCapture = !!move.captured;
  return {
    board,
    turn: piece.color === 'w' ? 'b' : 'w',
    castling,
    epSquare: move.isDoublePush ? (from + to) / 2 : null,
    halfmoveClock: piece.type === 'p' || isCapture ? 0 : state.halfmoveClock + 1,
    fullmove: piece.color === 'b' ? state.fullmove + 1 : state.fullmove,
  };
}

/** Legal moves for the piece on `from` (empty if not the side to move). */
export function legalMovesFrom(state: GameState, from: number): Move[] {
  const piece = state.board[from];
  if (!piece || piece.color !== state.turn) return [];
  return pseudoLegalMovesFrom(state, from).filter(
    (move) => !isInCheck(applyMove(state, move), piece.color),
  );
}

export function allLegalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = state.board[sq];
    if (p && p.color === state.turn) moves.push(...legalMovesFrom(state, sq));
  }
  return moves;
}

function hasSufficientMaterial(board: Board): boolean {
  // Insufficient: K vs K, K+minor vs K, or only same-colored-square bishops.
  const minors: { type: PieceType; squareColor: number }[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq];
    if (!p || p.type === 'k') continue;
    if (p.type === 'p' || p.type === 'r' || p.type === 'q') return true;
    minors.push({ type: p.type, squareColor: (rowOf(sq) + colOf(sq)) % 2 });
  }
  if (minors.length <= 1) return false;
  if (minors.every((m) => m.type === 'b' && m.squareColor === minors[0].squareColor)) {
    return false;
  }
  return true;
}

/**
 * Game status for `state`. Pass `history` (every position reached so far,
 * including the current one) to enable threefold-repetition detection; without
 * it, repetition is simply not reported.
 */
export function getStatus(state: GameState, history?: GameState[]): GameStatus {
  const inCheck = isInCheck(state, state.turn);
  if (allLegalMoves(state).length === 0) {
    return inCheck ? 'checkmate' : 'stalemate';
  }
  if (history && countRepetitions(state, history) >= 3) return 'draw-repetition';
  if (state.halfmoveClock >= 100) return 'draw-fifty-moves';
  if (!hasSufficientMaterial(state.board)) return 'draw-insufficient-material';
  return inCheck ? 'check' : 'playing';
}

/** How many times the position of `state` has occurred across `history`. */
function countRepetitions(state: GameState, history: GameState[]): number {
  const key = positionKey(state);
  let count = 0;
  for (const s of history) {
    if (positionKey(s) === key) count++;
  }
  return count;
}

/** Standard algebraic notation for a move, e.g. "Nf3", "exd5", "O-O", "e8=Q#". */
export function moveToSan(state: GameState, move: Move): string {
  const after = applyMove(state, move);
  const status = getStatus(after);
  const suffix = status === 'checkmate' ? '#' : status === 'check' ? '+' : '';

  if (move.isCastle) return (move.isCastle === 'k' ? 'O-O' : 'O-O-O') + suffix;

  const isCapture = !!move.captured;
  if (move.piece.type === 'p') {
    const capturePart = isCapture ? `${'abcdefgh'[colOf(move.from)]}x` : '';
    const promoPart = move.promotion ? `=${move.promotion.toUpperCase()}` : '';
    return capturePart + squareName(move.to) + promoPart + suffix;
  }

  // Disambiguate when another piece of the same type can reach the square.
  const rivals = allLegalMoves(state).filter(
    (m) => m.piece.type === move.piece.type && m.to === move.to && m.from !== move.from,
  );
  let disambig = '';
  if (rivals.length > 0) {
    const sameCol = rivals.some((m) => colOf(m.from) === colOf(move.from));
    const sameRow = rivals.some((m) => rowOf(m.from) === rowOf(move.from));
    if (!sameCol) disambig = 'abcdefgh'[colOf(move.from)];
    else if (!sameRow) disambig = `${8 - rowOf(move.from)}`;
    else disambig = squareName(move.from);
  }

  return (
    move.piece.type.toUpperCase() + disambig + (isCapture ? 'x' : '') + squareName(move.to) + suffix
  );
}
