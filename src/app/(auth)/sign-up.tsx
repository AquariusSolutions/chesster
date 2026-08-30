import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Field, GoogleButton, PrimaryButton } from "@/components/auth-ui";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { OnPrimary, Spacing } from "@/constants/theme";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { emailSignUpRequested, googleSignInRequested } from "@/store/authSlice";

export default function SignUpScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const status = useAppSelector((s) => s.auth.status);
  const serverError = useAppSelector((s) => s.auth.error);
  const user = useAppSelector((s) => s.auth.user);
  const loading = status === "loading";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  // Account created and signed in — return to the board. Defer the dismissal
  // by a frame so it doesn't share a commit with the re-render the auth-state
  // change triggers underneath.
  useEffect(() => {
    if (!user || user.isAnonymous) return;
    const id = requestAnimationFrame(() => router.back());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submit = () => {
    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setLocalError("Passwords do not match.");
      return;
    }
    setLocalError(null);
    dispatch(emailSignUpRequested(email.trim(), password));
  };

  const error = localError ?? serverError;
  const canSubmit =
    email.trim().length > 0 && password.length > 0 && confirm.length > 0 && !loading;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <ThemedText type="title">Create account</ThemedText>
              <ThemedText type="default" themeColor="textSecondary">
                Play and sync across devices
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
                placeholder="At least 6 characters"
                secureTextEntry
                autoCapitalize="none"
              />
              <Field
                label="Confirm password"
                value={confirm}
                onChangeText={setConfirm}
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
                label="Create account"
                loading={loading}
                disabled={!canSubmit}
                onPress={submit}
              />
            </View>

            <View style={styles.divider}>
              <View style={styles.line} />
              <ThemedText type="small" themeColor="textSecondary">
                or
              </ThemedText>
              <View style={styles.line} />
            </View>

            <GoogleButton
              disabled={loading}
              onPress={() => dispatch(googleSignInRequested())}
            />

            <View style={styles.footer}>
              <ThemedText type="small" themeColor="textSecondary">
                Already have an account?{" "}
              </ThemedText>
              <Link
                href="/sign-in"
                replace
                style={[styles.link, { color: OnPrimary }]}
              >
                Sign in
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
