import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { OnPrimary, Primary, Spacing } from "@/constants/theme";

/** Accent color used across the app. Now the light-gray brand primary. */
export const ACCENT = Primary;

/** A labeled segmented control: the active option is filled with the accent. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
        {label}
      </ThemedText>
      <View style={styles.group}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              style={styles.press}
              onPress={() => onChange(option.value)}
              disabled={active}
            >
              <View style={[styles.segment, active && styles.segmentActive]}>
                <ThemedText
                  type={active ? "smallBold" : "small"}
                  style={active ? styles.segmentTextActive : undefined}
                >
                  {option.label}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
  },
  label: {
    marginLeft: Spacing.one,
  },
  group: {
    flexDirection: "row",
    padding: 3,
    gap: 3,
    borderRadius: Spacing.two,
    backgroundColor: "rgba(127, 127, 127, 0.15)",
  },
  press: {
    flex: 1,
  },
  segment: {
    alignItems: "center",
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two - 3,
  },
  segmentActive: {
    backgroundColor: ACCENT,
  },
  segmentTextActive: {
    color: OnPrimary,
  },
});
