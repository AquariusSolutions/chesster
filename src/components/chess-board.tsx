import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { BoardPalette } from '@/constants/board-themes';
import { Board, colOf, Piece, PieceColor, rowOf } from '@/lib/chess';

/** How long a programmatic move (computer or tap) takes to slide into place. */
const MOVE_DURATION_MS = 300;

// Filled glyphs for both sides, tinted via text color, so white pieces don't
// render as thin outlines. The trailing U+FE0E forces text (monochrome)
// presentation — without it many systems render these as color emoji and ignore
// the tint, so white pieces come out black.
const VS_TEXT = '\uFE0E';
const GLYPHS: Record<Piece['type'], string> = {
  k: '♚' + VS_TEXT,
  q: '♛' + VS_TEXT,
  r: '♜' + VS_TEXT,
  b: '♝' + VS_TEXT,
  n: '♞' + VS_TEXT,
  p: '♟' + VS_TEXT,
};

const absoluteFill = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const;

export interface ChessBoardProps {
  board: Board;
  size: number;
  /** Board square + highlight colors. */
  palette: BoardPalette;
  /** Which color sits at the bottom of the board. */
  orientation: PieceColor;
  selected: number | null;
  /** Legal destination squares for the selected piece. */
  targets: number[];
  /** Legal destinations for every movable piece, keyed by its square. */
  movable: Record<number, number[]>;
  lastMove: { from: number; to: number } | null;
  /** Square of a king currently in check, for highlighting. */
  checkSquare: number | null;
  /**
   * A move to animate as a slide from `from` to `to` (e.g. the computer's
   * reply). The piece now sitting on `to` starts at `from` and eases home.
   */
  animatedMove: { from: number; to: number } | null;
  /** Whether the human may pick up and move pieces right now. */
  interactive: boolean;
  onSquarePress: (sq: number) => void;
  onDrop: (from: number, to: number) => void;
}

export function ChessBoard({
  board,
  size,
  palette,
  orientation,
  selected,
  targets,
  movable,
  lastMove,
  checkSquare,
  animatedMove,
  interactive,
  onSquarePress,
  onDrop,
}: ChessBoardProps) {
  const squareSize = size / 8;

  // Pixel position of a board square's top-left corner, honoring orientation.
  const xy = (sq: number) => {
    const dr = orientation === 'w' ? rowOf(sq) : 7 - rowOf(sq);
    const dc = orientation === 'w' ? colOf(sq) : 7 - colOf(sq);
    return { left: dc * squareSize, top: dr * squareSize };
  };

  return (
    <View style={[styles.board, { width: size, height: size }]}>
      {board.map((_, sq) => {
        const isDark = (rowOf(sq) + colOf(sq)) % 2 === 1;
        const isTarget = targets.includes(sq);
        const hasPiece = !!board[sq];
        const highlight =
          sq === checkSquare
            ? palette.check
            : sq === selected
              ? palette.selected
              : lastMove && (sq === lastMove.from || sq === lastMove.to)
                ? palette.lastMove
                : null;

        return (
          <Pressable
            key={sq}
            onPress={() => onSquarePress(sq)}
            style={[
              styles.square,
              xy(sq),
              { width: squareSize, height: squareSize },
              { backgroundColor: isDark ? palette.dark : palette.light },
            ]}>
            {highlight && <View style={[StyleSheet.absoluteFill, { backgroundColor: highlight }]} />}
            {isTarget &&
              (hasPiece ? (
                <View
                  style={[
                    styles.captureRing,
                    { borderRadius: squareSize / 2, borderWidth: squareSize * 0.07 },
                  ]}
                />
              ) : (
                <View style={styles.dotWrap}>
                  <View
                    style={{
                      width: squareSize * 0.3,
                      height: squareSize * 0.3,
                      borderRadius: squareSize * 0.15,
                      backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    }}
                  />
                </View>
              ))}
          </Pressable>
        );
      })}

      {board.map((piece, sq) => {
        if (!piece) return null;
        const home = xy(sq);
        // If this piece just arrived via an animated move, start it at the
        // origin square (as an offset from home) so it can slide in.
        let enterFrom: { x: number; y: number } | undefined;
        if (animatedMove && animatedMove.to === sq) {
          const origin = xy(animatedMove.from);
          enterFrom = { x: origin.left - home.left, y: origin.top - home.top };
        }
        return (
          <PieceView
            key={sq}
            sq={sq}
            piece={piece}
            squareSize={squareSize}
            home={home}
            orientation={orientation}
            dragTargets={movable[sq] ?? []}
            canDrag={interactive && (movable[sq]?.length ?? 0) > 0}
            enterFrom={enterFrom}
            onTap={onSquarePress}
            onDrop={onDrop}
          />
        );
      })}
    </View>
  );
}

interface PieceViewProps {
  sq: number;
  piece: Piece;
  squareSize: number;
  home: { left: number; top: number };
  orientation: PieceColor;
  dragTargets: number[];
  canDrag: boolean;
  /** Start offset (relative to home) to slide in from, for programmatic moves. */
  enterFrom?: { x: number; y: number };
  onTap: (sq: number) => void;
  onDrop: (from: number, to: number) => void;
}

function PieceView({
  sq,
  piece,
  squareSize,
  home,
  orientation,
  dragTargets,
  canDrag,
  enterFrom,
  onTap,
  onDrop,
}: PieceViewProps) {
  // Start at the origin square if sliding in, otherwise already home.
  const tx = useSharedValue(enterFrom?.x ?? 0);
  const ty = useSharedValue(enterFrom?.y ?? 0);
  const dragging = useSharedValue(0);
  // 1 while a slide-in is playing, so the moving piece stays above the others.
  const sliding = useSharedValue(enterFrom ? 1 : 0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: 1 + dragging.value * 0.1 },
    ],
    zIndex: dragging.value > 0 || sliding.value > 0 ? 10 : 1,
  }));

  // Ease the slide-in to home once, on mount.
  /* eslint-disable react-hooks/immutability */
  useEffect(() => {
    if (!enterFrom) return;
    tx.value = withTiming(0, { duration: MOVE_DURATION_MS });
    ty.value = withTiming(0, { duration: MOVE_DURATION_MS }, (finished) => {
      if (finished) sliding.value = 0;
    });
    // Mount-only: enterFrom is captured for this piece's arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onTap)(sq);
  });

  // Gesture callbacks are reanimated worklets; assigning to a shared value's
  // `.value` is the intended API, which the React Compiler rule misreads.
  const pan = Gesture.Pan()
    .enabled(canDrag)
    .onStart(() => {
      dragging.value = 1;
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      // Which square did the piece's center land on?
      const cx = home.left + e.translationX + squareSize / 2;
      const cy = home.top + e.translationY + squareSize / 2;
      const dc = Math.max(0, Math.min(7, Math.floor(cx / squareSize)));
      const dr = Math.max(0, Math.min(7, Math.floor(cy / squareSize)));
      const row = orientation === 'w' ? dr : 7 - dr;
      const col = orientation === 'w' ? dc : 7 - dc;
      const to = row * 8 + col;
      dragging.value = 0;
      if (dragTargets.includes(to)) {
        // Legal: snap home instantly; the parent re-render places the piece.
        tx.value = 0;
        ty.value = 0;
        runOnJS(onDrop)(sq, to);
      } else {
        tx.value = withSpring(0);
        ty.value = withSpring(0);
      }
    });
  /* eslint-enable react-hooks/immutability */

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <Animated.View
        style={[
          styles.pieceWrap,
          { left: home.left, top: home.top, width: squareSize, height: squareSize },
          animatedStyle,
        ]}>
        <Text
          style={[
            styles.piece,
            { fontSize: squareSize * 0.72, lineHeight: squareSize },
            piece.color === 'w' ? styles.whitePiece : styles.blackPiece,
          ]}>
          {GLYPHS[piece.type]}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  board: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  square: {
    position: 'absolute',
  },
  pieceWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  piece: {
    textAlign: 'center',
  },
  whitePiece: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  blackPiece: {
    color: '#1F1F1F',
  },
  dotWrap: {
    ...absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureRing: {
    ...absoluteFill,
    borderColor: 'rgba(0, 0, 0, 0.25)',
  },
});
