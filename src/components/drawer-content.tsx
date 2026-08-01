import { Ionicons } from "@expo/vector-icons";
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItem,
} from "expo-router/drawer";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { OnPrimary, Primary, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAppSelector } from "@/store/hooks";

export default function DrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAppSelector((s) => s.auth.user);
  const theme = useTheme();

  const isGuest = !user || user.isAnonymous;
  const name = isGuest ? "Guest" : user.displayName || user.email || "Player";
  const subtitle = isGuest ? "Playing as guest" : user.email ?? "";
  const initial = name.charAt(0).toUpperCase();

  const goToAuth = (path: "/sign-in" | "/sign-up") => {
    props.navigation.closeDrawer();
    router.push(path);
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + Spacing.two,
          paddingBottom: insets.bottom + Spacing.two,
        },
      ]}
    >
      <Pressable
        style={styles.header}
        onPress={() => props.navigation.navigate("profile")}
      >
        {user?.photoURL ? (
          <Image source={{ uri: user.photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <ThemedText style={styles.avatarInitial}>{initial}</ThemedText>
          </View>
        )}
        <View style={styles.headerText}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {name}
          </ThemedText>
          {subtitle ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
      </Pressable>

      <View style={styles.items}>
        <DrawerItem
          label="Play"
          labelStyle={{ color: theme.text }}
          icon={({ size }) => (
            <Ionicons name="game-controller-outline" size={size} color={theme.text} />
          )}
          onPress={() => props.navigation.navigate("index")}
        />
        <DrawerItem
          label="History"
          labelStyle={{ color: theme.text }}
          icon={({ size }) => (
            <Ionicons name="time-outline" size={size} color={theme.text} />
          )}
          onPress={() => props.navigation.navigate("history")}
        />
        <DrawerItem
          label="Profile"
          labelStyle={{ color: theme.text }}
          icon={({ size }) => (
            <Ionicons name="person-outline" size={size} color={theme.text} />
          )}
          onPress={() => props.navigation.navigate("profile")}
        />
      </View>

      {isGuest ? (
        <View style={styles.authItems}>
          <DrawerItem
            label="Sign in"
            labelStyle={{ color: theme.text }}
            icon={({ size }) => (
              <Ionicons name="log-in-outline" size={size} color={theme.text} />
            )}
            onPress={() => goToAuth("/sign-in")}
          />
          <DrawerItem
            label="Create account"
            labelStyle={styles.accent}
            icon={({ size }) => (
              <Ionicons name="person-add-outline" size={size} color={OnPrimary} />
            )}
            onPress={() => goToAuth("/sign-up")}
          />
        </View>
      ) : null}
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    backgroundColor: Primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: OnPrimary,
    fontSize: 22,
    lineHeight: 26,
    textAlign: "center",
    includeFontPadding: false,
    fontWeight: "700",
  },
  headerText: {
    flex: 1,
  },
  items: {
    marginTop: Spacing.two,
  },
  authItems: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(127, 127, 127, 0.3)",
  },
  accent: {
    color: OnPrimary,
  },
});
