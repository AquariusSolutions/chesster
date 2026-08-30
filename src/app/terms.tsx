import { ScrollView, StyleSheet } from "react-native";

import { TermsContent } from "@/components/terms-content";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";

/**
 * Read-only Terms & Conditions, reachable any time from the drawer. The
 * first-launch acceptance is handled separately by the TermsGate overlay.
 */
export default function TermsScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TermsContent />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
  },
});
