import { Host, Slider } from "@expo/ui";
import { StyleSheet, View } from "react-native";

import { ACCENT } from "@/components/segmented";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { Difficulty, levelLabel, MAX_LEVEL, MIN_LEVEL } from "@/lib/ai";

/**
 * Difficulty slider. Laid out to match `Segmented` — same label treatment and
 * spacing — so the two read as one settings list.
 */
export function LevelSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Difficulty;
  onChange: (value: Difficulty) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
          {label}
        </ThemedText>
        <ThemedText type="smallBold">
          {levelLabel(value)} · {value}
        </ThemedText>
      </View>
      <Host useViewportSizeMeasurement seedColor={ACCENT} style={styles.host}>
        <Slider
          value={value}
          min={MIN_LEVEL}
          max={MAX_LEVEL}
          step={1}
          // The native slider emits floats continuously while dragging, so
          // round and drop repeats — otherwise every frame dispatches.
          onValueChange={(next) => {
            const level = Math.round(next);
            if (level !== value) onChange(level);
          }}
        />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    marginLeft: Spacing.one,
  },
  // The hosted control has no intrinsic width, so without an explicit height
  // and `useViewportSizeMeasurement` the platform proposes a zero-width layout
  // and the slider collapses to a sliver.
  host: {
    width: "100%",
    height: 44,
  },
});
