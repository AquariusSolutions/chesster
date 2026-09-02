import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Primary, Spacing } from "@/constants/theme";
import { levelLabel, normalizeLevel } from "@/lib/ai";
import {
  computeChessIq,
  computeRecord,
  gameOutcome,
  Outcome,
} from "@/lib/insights";
import { deleteGame, loadGames, SavedGame } from "@/lib/realtime-db";
import { gameRestored, newGame } from "@/store/gameSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setElapsed } from "@/store/timerSlice";

const OUTCOME_LABEL: Record<Outcome, { text: string; color: string }> = {
  win: { text: "Win", color: "#2E9E5B" },
  loss: { text: "Loss", color: "#E24242" },
  draw: { text: "Draw", color: "#8894A3" },
  playing: { text: "Playing", color: "#208AEF" },
};

function outcome(game: SavedGame): { text: string; color: string } {
  return OUTCOME_LABEL[gameOutcome(game)];
}

export default function HistoryScreen() {
  const uid = useAppSelector((s) => s.auth.user?.uid);
  const currentGameId = useAppSelector((s) => s.game.id);
  const dispatch = useAppDispatch();
  const [games, setGames] = useState<SavedGame[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(
    () =>
      games && games.length
        ? { record: computeRecord(games), iq: computeChessIq(games) }
        : null,
    [games],
  );

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setError(null);
    try {
      setGames(await loadGames(uid));
    } catch (e) {
      console.warn("[history] failed to load games:", e);
      setError("Couldn't load your games. Check your connection and try again.");
      setGames((prev) => prev ?? []);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const remove = useCallback(
    async (game: SavedGame) => {
      if (!uid) return;
      // Drop it locally first so the row leaves under the finger.
      setGames((prev) => prev?.filter((g) => g.id !== game.id) ?? prev);
      // Deleting the game you're in the middle of leaves nothing to play, so
      // start a fresh one rather than stranding the board on a deleted record.
      if (game.id === currentGameId) dispatch(newGame());
      try {
        await deleteGame(uid, game.id);
      } catch (e) {
        console.warn("[history] failed to delete game:", e);
        load();
      }
    },
    [uid, currentGameId, dispatch, load],
  );

  const resume = useCallback(
    (game: SavedGame) => {
      if (gameOutcome(game) !== "playing") return;
      dispatch(
        gameRestored({
          id: game.id,
          createdAt: game.createdAt,
          moves: game.moves,
        }),
      );
      dispatch(setElapsed(game.elapsed));
      router.navigate("/");
    },
    [dispatch],
  );

  if (loading && games === null) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (games !== null && games.length === 0) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="default" themeColor="textSecondary">
          {error ?? "No games yet."}
        </ThemedText>
        {!error ? (
          <ThemedText type="small" themeColor="textSecondary">
            Play a move and it will appear here.
          </ThemedText>
        ) : null}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={games ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={summary ? <SummaryHeader {...summary} /> : null}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        renderItem={({ item }) => (
          <GameRow item={item} onDelete={remove} onResume={resume} />
        )}
      />
    </ThemedView>
  );
}

function SummaryHeader({
  record,
  iq,
}: {
  record: ReturnType<typeof computeRecord>;
  iq: ReturnType<typeof computeChessIq>;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.summary}>
      <View style={styles.iqBlock}>
        <ThemedText type="small" themeColor="textSecondary">
          Chess IQ
        </ThemedText>
        <ThemedText style={[styles.iqValue, { color: Primary }]}>
          {iq.score ?? "—"}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {iq.provisional && iq.score !== null ? `${iq.tier} · provisional` : iq.tier}
        </ThemedText>
      </View>
      <View style={styles.recordBlock}>
        <Stat label="Wins" value={record.wins} color="#2E9E5B" />
        <Stat label="Draws" value={record.draws} color="#8894A3" />
        <Stat label="Losses" value={record.losses} color="#E24242" />
      </View>
    </ThemedView>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.stat}>
      <ThemedText style={[styles.statValue, { color }]}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function GameRow({
  item,
  onDelete,
  onResume,
}: {
  item: SavedGame;
  onDelete: (game: SavedGame) => void;
  onResume: (game: SavedGame) => void;
}) {
  const o = outcome(item);
  const unfinished = gameOutcome(item) === "playing";
  // Records written before games carried a timestamp have no `createdAt`.
  const date = Number.isFinite(item.createdAt)
    ? new Date(item.createdAt).toLocaleDateString()
    : "Undated";
  const minutes = Math.floor(item.elapsed / 60);
  const seconds = String(item.elapsed % 60).padStart(2, "0");

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      renderRightActions={() => (
        <Pressable style={styles.deleteAction} onPress={() => onDelete(item)}>
          <ThemedText style={styles.deleteText}>Delete</ThemedText>
        </Pressable>
      )}
    >
      <Pressable onPress={() => onResume(item)} disabled={!unfinished}>
        <ThemedView type="backgroundElement" style={styles.row}>
          <View style={[styles.badge, { backgroundColor: o.color }]}>
            <ThemedText style={styles.badgeText}>{o.text}</ThemedText>
          </View>
          <View style={styles.rowText}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {item.moves.length} moves · {minutes}:{seconds}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {date} · vs Computer ({levelLabel(normalizeLevel(item.difficulty))})
              {unfinished ? " · tap to continue" : ""}
            </ThemedText>
          </View>
        </ThemedView>
      </Pressable>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one,
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.three,
    borderRadius: Spacing.two,
    marginBottom: Spacing.two,
    gap: Spacing.three,
  },
  iqBlock: {
    alignItems: "center",
    paddingRight: Spacing.three,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "#8894A3",
  },
  iqValue: {
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 38,
  },
  recordBlock: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  badge: {
    minWidth: 52,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.one,
    alignItems: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  rowText: {
    flex: 1,
  },
  deleteAction: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    marginLeft: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: "#E24242",
  },
  deleteText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
