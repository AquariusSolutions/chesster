import { useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/auth-ui";
import { TermsContent } from "@/components/terms-content";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { TERMS_VERSION } from "@/constants/legal";
import { Spacing } from "@/constants/theme";
import { termsAccepted } from "@/store/legalSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/**
 * A blocking, full-screen overlay shown until the user accepts the current
 * Terms & Conditions version. It sits above the whole app (rendered from the
 * root layout) so it gates everyone, including guests, on first launch and
 * again whenever TERMS_VERSION is bumped. Renders nothing once accepted.
 */
export function TermsGate() {
  const dispatch = useAppDispatch();
  const acceptedVersion = useAppSelector((s) => s.legal.acceptedVersion);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  // Track the visible and content heights so short terms that don't scroll
  // still enable the button (otherwise onScroll would never fire).
  const viewportHeight = useRef(0);
  const syncFits = (contentHeight: number) => {
    if (viewportHeight.current > 0 && contentHeight <= viewportHeight.current) {
      setScrolledToEnd(true);
    }
  };

  if (acceptedVersion === TERMS_VERSION) return null;

  return (
    <ThemedView style={StyleSheet.absoluteFill}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <ThemedText type="title">Terms &amp; Conditions</ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            Please review and accept to continue.
          </ThemedText>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          onLayout={({ nativeEvent }) => {
            viewportHeight.current = nativeEvent.layout.height;
          }}
          onContentSizeChange={(_w, h) => syncFits(h)}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } =
              nativeEvent;
            // Enable acceptance once the user has scrolled to the bottom.
            if (
              layoutMeasurement.height + contentOffset.y >=
              contentSize.height - 24
            ) {
              setScrolledToEnd(true);
            }
          }}
          scrollEventThrottle={16}
        >
          <TermsContent />
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label={scrolledToEnd ? "I Accept" : "Scroll to read all"}
            disabled={!scrolledToEnd}
            onPress={() => dispatch(termsAccepted(TERMS_VERSION))}
          />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.one,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
});
