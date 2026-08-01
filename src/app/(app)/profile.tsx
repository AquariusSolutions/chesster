import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { AvatarPicker } from "@/components/avatar-picker";
import { Field, PrimaryButton } from "@/components/auth-ui";
import { ACCENT, Segmented } from "@/components/segmented";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  BOARD_THEME_OPTIONS,
  BOARD_THEMES,
} from "@/constants/board-themes";
import { Spacing } from "@/constants/theme";
import {
  avatarRemoveRequested,
  avatarUpdateRequested,
  deleteAccountRequested,
  reauthCancelled,
  signOutRequested,
} from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setBoardTheme,
  setThemePreference,
  ThemePreference,
} from "@/store/settingsSlice";

/** Square crop at modest quality — the avatar renders at 96pt. */
const PHOTO_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const photoUpdating = useAppSelector((s) => s.auth.photoUpdating);
  const reauthNeeded = useAppSelector((s) => s.auth.reauthNeeded);
  const errorText = useAppSelector((s) => s.auth.error);
  const boardTheme = useAppSelector((s) => s.settings.boardTheme);
  const themePreference = useAppSelector((s) => s.settings.themePreference);

  const [reauthPassword, setReauthPassword] = useState("");

  const isGuest = !user || user.isAnonymous;
  const name =
    user?.displayName ||
    (user?.isAnonymous ? "Guest" : user?.email) ||
    "Player";
  const subtitle = user?.isAnonymous ? "Playing as guest" : user?.email ?? "";
  const initial = name.charAt(0).toUpperCase();

  const applyResult = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled) {
      dispatch(avatarUpdateRequested(result.assets[0].uri));
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Allow camera access to take a profile picture.",
      );
      return;
    }
    applyResult(await ImagePicker.launchCameraAsync(PHOTO_OPTIONS));
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo access to set a profile picture.",
      );
      return;
    }
    applyResult(await ImagePicker.launchImageLibraryAsync(PHOTO_OPTIONS));
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete account",
      "This permanently deletes your account and saved games. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => dispatch(deleteAccountRequested()),
        },
      ],
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <AvatarPicker
            photoURL={user?.photoURL}
            initial={initial}
            updating={photoUpdating}
            onTakePhoto={takePhoto}
            onChooseFromLibrary={pickFromLibrary}
            onRemovePhoto={
              user?.photoURL
                ? () => dispatch(avatarRemoveRequested())
                : undefined
            }
          />
          <ThemedText type="subtitle">{name}</ThemedText>
          {subtitle ? (
            <ThemedText type="small" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            APPEARANCE
          </ThemedText>
          <Segmented
            label="Theme"
            value={themePreference}
            options={THEME_OPTIONS}
            onChange={(value) => dispatch(setThemePreference(value))}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            BOARD
          </ThemedText>
          <View style={styles.boardGrid}>
            {BOARD_THEME_OPTIONS.map((option) => {
              const p = BOARD_THEMES[option.value];
              const active = option.value === boardTheme;
              return (
                <Pressable
                  key={option.value}
                  style={styles.boardOption}
                  onPress={() => dispatch(setBoardTheme(option.value))}
                >
                  <View style={[styles.swatch, active && styles.swatchActive]}>
                    <View style={styles.swatchRow}>
                      <View style={[styles.cell, { backgroundColor: p.light }]} />
                      <View style={[styles.cell, { backgroundColor: p.dark }]} />
                    </View>
                    <View style={styles.swatchRow}>
                      <View style={[styles.cell, { backgroundColor: p.dark }]} />
                      <View style={[styles.cell, { backgroundColor: p.light }]} />
                    </View>
                  </View>
                  <ThemedText type={active ? "smallBold" : "small"}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            ACCOUNT
          </ThemedText>
          {!isGuest ? (
            <Pressable
              onPress={() => dispatch(signOutRequested())}
              style={({ pressed }) => [styles.signOutButton, pressed && styles.dim]}
            >
              <ThemedText type="smallBold">Sign out</ThemedText>
            </Pressable>
          ) : null}
          <Pressable
            onPress={confirmDelete}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.dim]}
          >
            <ThemedText type="smallBold" style={styles.deleteText}>
              Delete account
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        transparent
        visible={reauthNeeded}
        animationType="fade"
        onRequestClose={() => dispatch(reauthCancelled())}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => dispatch(reauthCancelled())}
        >
          <Pressable onPress={() => {}}>
            <ThemedView type="backgroundElement" style={styles.reauthCard}>
              <ThemedText type="smallBold">Confirm your password</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                For security, re-enter your password to delete your account.
              </ThemedText>
              <Field
                label="Password"
                value={reauthPassword}
                onChangeText={setReauthPassword}
                secureTextEntry
                autoCapitalize="none"
              />
              {errorText ? (
                <ThemedText type="small" style={styles.deleteText}>
                  {errorText}
                </ThemedText>
              ) : null}
              <View style={styles.reauthButtons}>
                <Pressable
                  style={styles.reauthCancel}
                  onPress={() => {
                    dispatch(reauthCancelled());
                    setReauthPassword("");
                  }}
                >
                  <ThemedText type="smallBold">Cancel</ThemedText>
                </Pressable>
                <View style={styles.reauthConfirm}>
                  <PrimaryButton
                    label="Delete"
                    disabled={reauthPassword.length === 0}
                    onPress={() => {
                      dispatch(deleteAccountRequested(reauthPassword));
                      setReauthPassword("");
                    }}
                  />
                </View>
              </View>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.five,
  },
  header: {
    alignItems: "center",
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.three,
  },
  signOutButton: {
    alignItems: "center",
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: "rgba(127, 127, 127, 0.4)",
  },
  deleteButton: {
    alignItems: "center",
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: "#E24242",
  },
  deleteText: {
    color: "#E24242",
  },
  dim: {
    opacity: 0.6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.four,
  },
  reauthCard: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    minWidth: 300,
  },
  reauthButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  reauthCancel: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  reauthConfirm: {
    flex: 1,
  },
  boardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.four,
  },
  boardOption: {
    alignItems: "center",
    gap: Spacing.one,
  },
  swatch: {
    width: 64,
    height: 64,
    borderRadius: Spacing.two,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchActive: {
    borderColor: ACCENT,
  },
  swatchRow: {
    flexDirection: "row",
    flex: 1,
  },
  cell: {
    flex: 1,
  },
});
