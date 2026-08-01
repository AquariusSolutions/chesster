import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
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
import { Spacing } from "@/constants/theme";
import { levelLabel, normalizeLevel } from "@/lib/ai";
import { deleteGame, loadGames, SavedGame, UNFINISHED } from "@/lib/realtime-db";
import { gameRestored, newGame } from "@/store/gameSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setElapsed } from "@/store/timerSlice";

function outcome(game: SavedGame): { text: string; color: string } {
  if (game.result === UNFINISHED) {
    return { text: "Playing", color: "#208AEF" };
  }
  if (game.result === "checkmate") {
    // At checkmate the side to move is the one mated (the loser).
    const loser = game.moves.length % 2 === 0 ? "w" : "b";
    const won = loser !== game.humanColor;
    return won
      ? { text: "Win", color: "#2E9E5B" }
      : { text: "Loss", color: "#E24242" };
  }
  return { text: "Draw", color: "#8894A3" };
}

export default function HistoryScreen() {
  const uid = useAppSelector((s) => s.auth.user?.uid);
  const currentGameId = useAppSelector((s) => s.game.id);
  const dispatch = useAppDispatch();
  const [games, setGames] = useState<SavedGame[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (game.result !== UNFINISHED) return;
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
  const unfinished = item.result === UNFINISHED;
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
