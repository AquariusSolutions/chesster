import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { loadGames, SavedGame } from "@/lib/firestore";
import { useAppSelector } from "@/store/hooks";

function outcome(game: SavedGame): { text: string; color: string } {
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
      setError("Couldn't load your games. Check your connection and Firestore setup.");
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
            Finish a game and it will appear here.
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
        renderItem={({ item }) => {
          const o = outcome(item);
          const date = new Date(item.createdAt).toLocaleDateString();
          const minutes = Math.floor(item.elapsed / 60);
          const seconds = String(item.elapsed % 60).padStart(2, "0");
          return (
            <ThemedView type="backgroundElement" style={styles.row}>
              <View style={[styles.badge, { backgroundColor: o.color }]}>
                <ThemedText style={styles.badgeText}>{o.text}</ThemedText>
              </View>
              <View style={styles.rowText}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {item.moves.length} moves · {minutes}:{seconds}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {date} · vs Computer ({item.difficulty})
                </ThemedText>
              </View>
            </ThemedView>
          );
        }}
      />
    </ThemedView>
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
});
