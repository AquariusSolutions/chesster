import { Ionicons } from "@expo/vector-icons";

import { ChessBoard } from "@/components/chess-board";
import { LevelSlider } from "@/components/level-slider";
import { ACCENT, Segmented } from "@/components/segmented";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BOARD_THEMES } from "@/constants/board-themes";
import { OnPrimary, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { Difficulty } from "@/lib/ai";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  allLegalMoves,
  findKing,
  GameStatus,
  getStatus,
  legalMovesFrom,
  Move,
  PieceColor,
  PieceType,
} from "@/lib/chess";
import {
  commitMove as commitMoveAction,
  newGame as newGameAction,
  undo as undoAction,
} from "@/store/gameSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setDifficulty as setDifficultyAction,
  setHumanColor as setHumanColorAction,
} from "@/store/settingsSlice";
import {
  RefObject,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation } from "expo-router";
import { DrawerNavigationProp } from "expo-router/drawer";

// Trailing U+FE0E forces monochrome text rendering so the color tint applies
// (otherwise these render as color emoji and white pieces come out black).
const VS_TEXT = "\uFE0E";
const GLYPHS: Record<PieceType, string> = {
  k: "♚" + VS_TEXT,
  q: "♛" + VS_TEXT,
  r: "♜" + VS_TEXT,
  b: "♝" + VS_TEXT,
  n: "♞" + VS_TEXT,
  p: "♟" + VS_TEXT,
};

const PROMOTION_CHOICES: PieceType[] = ["q", "r", "b", "n"];

function statusText(status: GameStatus, turn: PieceColor): string {
  const other = turn === "w" ? "Black" : "White";
  switch (status) {
    case "checkmate":
      return `Checkmate — ${other} wins`;
    case "stalemate":
      return "Draw — stalemate";
    case "draw-fifty-moves":
      return "Draw — 50-move rule";
    case "draw-insufficient-material":
      return "Draw — insufficient material";
    case "draw-repetition":
      return "Draw — threefold repetition";
    default:
      return "";
  }
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Header title: the game clock, or the result once the game is over. */
function HeaderTitle() {
  const elapsed = useAppSelector((s) => s.timer.elapsed);
  const history = useAppSelector((s) => s.game.history);
  const state = history[history.length - 1].state;
  const status = useMemo(
    () => getStatus(state, history.map((h) => h.state)),
    [state, history],
  );
  const gameOver = status !== "playing" && status !== "check";

  if (gameOver) {
    return (
      <ThemedText type="smallBold" numberOfLines={1}>
        {statusText(status, state.turn)}
      </ThemedText>
    );
  }
  return (
    <ThemedText type="smallBold" style={styles.clockTitle}>
      {formatClock(elapsed)}
    </ThemedText>
  );
}

function HeaderGear({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={12} style={styles.headerButton}>
      <Ionicons name="settings-outline" size={22} color={theme.text} />
    </Pressable>
  );
}

export default function GameScreen() {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - Spacing.three * 2, 440);
  const dispatch = useAppDispatch();

  const navigation =
    useNavigation<DrawerNavigationProp<ReactNavigation.RootParamList>>();
  const history = useAppSelector((s) => s.game.history);
  const animatedMove = useAppSelector((s) => s.game.animatedMove);
  const humanColor = useAppSelector((s) => s.settings.humanColor);
  const difficulty = useAppSelector((s) => s.settings.difficulty);
  const palette = useAppSelector((s) => BOARD_THEMES[s.settings.boardTheme]);

  const [selected, setSelected] = useState<number | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<Move[] | null>(null);
  const settingsRef = useRef<BottomSheetModal>(null);

  // The drawer supplies the menu (☰) on the left; add the clock/result title
  // and the settings (⚙) button on the right.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle />,
      headerRight: () => (
        <HeaderGear onPress={() => settingsRef.current?.present()} />
      ),
    });
  }, [navigation]);

  const aiColor: PieceColor = humanColor === "w" ? "b" : "w";
  const current = history[history.length - 1];
  const state = current.state;

  const status = useMemo(
    () =>
      getStatus(
        state,
        history.map((h) => h.state),
      ),
    [state, history],
  );
  const gameOver = status !== "playing" && status !== "check";
  const aiToMove = !gameOver && state.turn === aiColor;
  const humanToMove = !gameOver && state.turn === humanColor;

  const selectedMoves = useMemo(
    () => (selected !== null ? legalMovesFrom(state, selected) : []),
    [state, selected],
  );

  // Legal destinations for each of the side-to-move's pieces, for drag-and-drop.
  const movable = useMemo(() => {
    const map: Record<number, number[]> = {};
    if (!humanToMove) return map;
    for (const m of allLegalMoves(state)) (map[m.from] ??= []).push(m.to);
    return map;
  }, [state, humanToMove]);

  const checkSquare =
    status === "check" || status === "checkmate"
      ? findKing(state.board, state.turn)
      : null;

  // Moves are dispatched to the store; the saga plays the computer's reply.
  const commitMove = (move: Move, animate: boolean) => {
    dispatch(commitMoveAction({ move, animate }));
    setSelected(null);
    setPendingPromotion(null);
  };

  const tryMove = (from: number, to: number, animate: boolean) => {
    const moves = legalMovesFrom(state, from).filter((m) => m.to === to);
    setSelected(null);
    if (moves.length === 1) commitMove(moves[0], animate);
    else if (moves.length > 1) setPendingPromotion(moves); // promotion — ask which piece
  };

  const onSquarePress = (sq: number) => {
    if (gameOver || pendingPromotion || aiToMove) return;
    if (selected !== null && selectedMoves.some((m) => m.to === sq)) {
      tryMove(selected, sq, true); // tapped move: slide the piece over
      return;
    }
    const piece = state.board[sq];
    setSelected(
      piece && piece.color === state.turn && sq !== selected ? sq : null,
    );
  };

  const onDrop = (from: number, to: number) => {
    if (gameOver || pendingPromotion || !humanToMove) return;
    tryMove(from, to, false); // dragged move: the finger already animated it
  };

  const undo = () => {
    dispatch(undoAction({ aiColor }));
    setSelected(null);
    setPendingPromotion(null);
  };

  const newGame = () => {
    dispatch(newGameAction());
    setSelected(null);
    setPendingPromotion(null);
  };

  const chooseSide = (color: PieceColor) => {
    dispatch(setHumanColorAction(color));
    newGame();
  };

  const promotionColor = pendingPromotion?.[0]?.piece.color;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <ChessBoard
          board={state.board}
          size={boardSize}
          palette={palette}
          orientation={humanColor}
          selected={selected}
          targets={selectedMoves.map((m) => m.to)}
          movable={movable}
          lastMove={
            current.move
              ? { from: current.move.from, to: current.move.to }
              : null
          }
          checkSquare={checkSquare}
          animatedMove={animatedMove}
          interactive={humanToMove}
          onSquarePress={onSquarePress}
          onDrop={onDrop}
        />
      </SafeAreaView>

      <SettingsSheet
        sheetRef={settingsRef}
        humanColor={humanColor}
        onChooseSide={chooseSide}
        difficulty={difficulty}
        onChooseDifficulty={(value) => dispatch(setDifficultyAction(value))}
        onNewGame={() => {
          newGame();
          settingsRef.current?.dismiss();
        }}
        onUndo={undo}
        canUndo={history.length > 1 && !aiToMove && !gameOver}
      />

      <Modal transparent visible={!!pendingPromotion} animationType="fade">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setPendingPromotion(null)}
        >
          <ThemedView type="backgroundElement" style={styles.promotionCard}>
            <ThemedText type="smallBold">Promote to</ThemedText>
            <ThemedView style={styles.promotionChoices}>
              {PROMOTION_CHOICES.map((type) => (
                <Pressable
                  key={type}
                  style={styles.promotionChoice}
                  onPress={() => {
                    const move = pendingPromotion?.find(
                      (m) => m.promotion === type,
                    );
                    if (move) commitMove(move, false);
                  }}
                >
                  <Text
                    style={[
                      styles.promotionGlyph,
                      promotionColor === "w"
                        ? styles.whiteGlyph
                        : styles.blackGlyph,
                    ]}
                  >
                    {GLYPHS[type]}
                  </Text>
                </Pressable>
              ))}
            </ThemedView>
          </ThemedView>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

function SettingsSheet({
  sheetRef,
  humanColor,
  onChooseSide,
  difficulty,
  onChooseDifficulty,
  onNewGame,
  onUndo,
  canUndo,
}: {
  sheetRef: RefObject<BottomSheetModal | null>;
  humanColor: PieceColor;
  onChooseSide: (color: PieceColor) => void;
  difficulty: Difficulty;
  onChooseDifficulty: (value: Difficulty) => void;
  onNewGame: () => void;
  onUndo: () => void;
  canUndo: boolean;
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // Dim layer fades in/out as the sheet moves, and tapping it closes the sheet.
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      // The sheet's content pan gesture activates as soon as a touch moves,
      // which stole every drag from the level slider (taps still landed).
      // Dragging the handle and tapping the backdrop still dismiss the sheet.
      enableContentPanningGesture={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.backgroundElement }}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView
        style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.four }]}
      >
        <ThemedText type="subtitle" style={styles.sheetTitle}>
          Settings
        </ThemedText>

        <Segmented
          label="You play"
          value={humanColor}
          options={[
            { value: "w", label: "White" },
            { value: "b", label: "Black" },
          ]}
          onChange={onChooseSide}
        />
        <LevelSlider
          label="Level"
          value={difficulty}
          onChange={onChooseDifficulty}
        />

        <View style={styles.sheetButtons}>
          <ActionButton label="New game" onPress={onNewGame} />
          <ActionButton label="Undo" onPress={onUndo} disabled={!canUndo} />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable style={styles.buttonPress} onPress={onPress} disabled={disabled}>
      {({ pressed }) => (
        <View
          style={[
            styles.button,
            pressed && styles.buttonPressed,
            disabled && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
  safeArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
  },
  clockTitle: {
    fontVariant: ["tabular-nums"],
  },
  headerButton: {
    paddingHorizontal: Spacing.three,
  },
  whiteGlyph: {
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.45)",
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  blackGlyph: {
    color: "#1F1F1F",
  },
  buttonPress: {
    flex: 1,
  },
  button: {
    alignItems: "center",
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: ACCENT,
  },
  buttonText: {
    color: OnPrimary,
    fontWeight: "700",
    fontSize: 15,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  promotionCard: {
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.three,
  },
  promotionChoices: {
    flexDirection: "row",
    gap: Spacing.two,
    backgroundColor: "transparent",
  },
  promotionChoice: {
    padding: Spacing.two,
  },
  promotionGlyph: {
    fontSize: 40,
  },
  handleIndicator: {
    backgroundColor: "rgba(127, 127, 127, 0.5)",
    width: 40,
  },
  sheet: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  sheetTitle: {
    fontSize: 22,
    lineHeight: 28,
  },
  sheetButtons: {
    flexDirection: "row",
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
});
