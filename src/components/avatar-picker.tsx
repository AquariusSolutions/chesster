import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useCallback, useRef } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ACCENT } from "@/components/segmented";
import { ThemedText } from "@/components/themed-text";
import { OnPrimary, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const AVATAR_SIZE = 96;

/**
 * The profile picture and its action sheet. Presentational — the screen owns
 * the permission prompts and picker calls and passes them in as handlers.
 */
export function AvatarPicker({
  photoURL,
  initial,
  updating,
  onTakePhoto,
  onChooseFromLibrary,
  onRemovePhoto,
}: {
  photoURL: string | null | undefined;
  initial: string;
  updating: boolean;
  onTakePhoto: () => void;
  onChooseFromLibrary: () => void;
  /** Omitted when there is no picture to remove. */
  onRemovePhoto?: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);

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

  // Dismiss first so the sheet animates out while the picker opens, rather
  // than the two overlapping.
  const run = (action: () => void) => () => {
    sheetRef.current?.dismiss();
    action();
  };

  return (
    <>
      <Pressable
        onPress={() => sheetRef.current?.present()}
        disabled={updating}
        accessibilityRole="button"
        accessibilityLabel="Change profile picture"
      >
        {({ pressed }) => (
          <View style={[styles.avatarWrap, pressed && styles.avatarPressed]}>
            <View style={[styles.ring, { borderColor: ACCENT }]}>
              {photoURL ? (
                <Image source={{ uri: photoURL }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.fallback]}>
                  <ThemedText style={styles.initial}>{initial}</ThemedText>
                </View>
              )}
              {updating ? (
                <View style={[styles.avatar, styles.overlay]}>
                  <ActivityIndicator color={OnPrimary} />
                </View>
              ) : null}
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: ACCENT, borderColor: theme.background },
              ]}
            >
              <Ionicons name="camera" size={16} color={OnPrimary} />
            </View>
          </View>
        )}
      </Pressable>

      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.backgroundElement }}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView
          style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.four }]}
        >
          <ThemedText type="subtitle" style={styles.sheetTitle}>
            Profile picture
          </ThemedText>
          <SheetAction
            icon="camera-outline"
            label="Take photo"
            onPress={run(onTakePhoto)}
          />
          <SheetAction
            icon="images-outline"
            label="Choose from library"
            onPress={run(onChooseFromLibrary)}
          />
          {onRemovePhoto ? (
            <SheetAction
              icon="trash-outline"
              label="Remove photo"
              destructive
              onPress={run(onRemovePhoto)}
            />
          ) : null}
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}

function SheetAction({
  icon,
  label,
  destructive,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const color = destructive ? DESTRUCTIVE : theme.text;
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View style={[styles.action, pressed && styles.actionPressed]}>
          <Ionicons name={icon} size={22} color={color} />
          <ThemedText type="default" style={{ color }}>
            {label}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const DESTRUCTIVE = "#E24242";

const styles = StyleSheet.create({
  avatarWrap: {
    alignSelf: "center",
  },
  avatarPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  ring: {
    padding: 3,
    borderWidth: 2,
    borderRadius: (AVATAR_SIZE + 10) / 2,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(127, 127, 127, 0.25)",
  },
  initial: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: "700",
  },
  overlay: {
    position: "absolute",
    top: 3,
    left: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  badge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  handleIndicator: {
    backgroundColor: "rgba(127, 127, 127, 0.5)",
  },
  sheet: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.one,
  },
  sheetTitle: {
    paddingVertical: Spacing.two,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    borderCurve: "continuous",
  },
  actionPressed: {
    backgroundColor: "rgba(127, 127, 127, 0.18)",
  },
});
