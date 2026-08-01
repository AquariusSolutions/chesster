import { FontAwesome } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { OnPrimary, Primary, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/** Accent color used across the app. Now the light-gray brand primary. */
export const ACCENT = Primary;

export function Field({
  label,
  ...props
}: { label: string } & TextInputProps) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.backgroundElement },
        ]}
        {...props}
      />
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      style={styles.pressFull}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.primary,
            (pressed || loading) && styles.dim,
            disabled && styles.disabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={OnPrimary} />
          ) : (
            <Text style={styles.primaryText}>{label}</Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable style={styles.pressFull} onPress={onPress} disabled={disabled}>
      {({ pressed }) => (
        <View
          style={[
            styles.secondary,
            { borderColor: theme.backgroundSelected },
            pressed && styles.dim,
            disabled && styles.disabled,
          ]}
        >
          <Text style={[styles.secondaryText, { color: theme.text }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** Circular icon-only "Continue with Google" button. */
export function GoogleButton({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel="Continue with Google"
      style={styles.googlePress}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.googleCircle,
            { borderColor: theme.backgroundSelected },
            pressed && styles.dim,
            disabled && styles.disabled,
          ]}
        >
          <FontAwesome name="google" size={22} color="#DB4437" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  googlePress: {
    alignSelf: "center",
  },
  googleCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  pressFull: {
    width: "100%",
  },
  primary: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    borderRadius: Spacing.two,
    backgroundColor: ACCENT,
  },
  primaryText: {
    color: OnPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  secondary: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  secondaryText: {
    fontWeight: "600",
    fontSize: 16,
  },
  dim: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
