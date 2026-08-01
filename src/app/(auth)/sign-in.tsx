import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Field, PrimaryButton, SecondaryButton } from "@/components/auth-ui";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { OnPrimary, Spacing } from "@/constants/theme";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  emailSignInRequested,
  googleSignInRequested,
} from "@/store/authSlice";

export default function SignInScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const status = useAppSelector((s) => s.auth.status);
  const error = useAppSelector((s) => s.auth.error);
  const user = useAppSelector((s) => s.auth.user);
  const loading = status === "loading";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  // A real (non-guest) sign-in succeeded — return to the board.
  useEffect(() => {
    if (user && !user.isAnonymous) router.back();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <ThemedText type="title">Chesster</ThemedText>
              <ThemedText type="default" themeColor="textSecondary">
                Sign in to save your games
              </ThemedText>
            </View>

            <View style={styles.form}>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
              />
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
              />

              {error ? (
                <ThemedText type="small" style={styles.error}>
                  {error}
                </ThemedText>
              ) : null}

              <PrimaryButton
                label="Sign in"
                loading={loading}
                disabled={!canSubmit}
                onPress={() =>
                  dispatch(emailSignInRequested(email.trim(), password))
                }
              />
            </View>

            <View style={styles.divider}>
              <View style={styles.line} />
              <ThemedText type="small" themeColor="textSecondary">
                or
              </ThemedText>
              <View style={styles.line} />
            </View>

            <View style={styles.form}>
              <SecondaryButton
                label="Continue with Google"
                disabled={loading}
                onPress={() => dispatch(googleSignInRequested())}
              />
              <SecondaryButton
                label="Continue as guest"
                disabled={loading}
                onPress={() => router.back()}
              />
            </View>

            <View style={styles.footer}>
              <ThemedText type="small" themeColor="textSecondary">
                Don&apos;t have an account?{" "}
              </ThemedText>
              <Link
                href="/sign-up"
                replace
                style={[styles.link, { color: OnPrimary }]}
              >
                Sign up
              </Link>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: "center",
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  header: {
    alignItems: "center",
    gap: Spacing.one,
  },
  form: {
    gap: Spacing.three,
  },
  error: {
    color: "#E24242",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(127, 127, 127, 0.4)",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  link: {
    fontSize: 14,
    fontWeight: "700",
  },
});
