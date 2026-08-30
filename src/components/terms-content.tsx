import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import {
  LEGAL_CONTACT_EMAIL,
  TERMS_EFFECTIVE_DATE,
} from "@/constants/legal";

/**
 * ⚠️ PLACEHOLDER LEGAL TEXT — NOT LEGAL ADVICE.
 *
 * This is a generic template so the accept/gate mechanism is fully functional.
 * Before shipping, REPLACE every section below with Terms & Conditions reviewed
 * and approved by a qualified lawyer for your jurisdiction(s). When the wording
 * changes materially, bump TERMS_VERSION in `constants/legal.ts` so existing
 * users are prompted to accept the new version.
 */
const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "1. Acceptance of Terms",
    body: "By downloading, accessing, or using Chesster (the “App”), you agree to be bound by these Terms & Conditions. If you do not agree, do not use the App.",
  },
  {
    heading: "2. Eligibility",
    body: "You must be at least 13 years old (or the minimum age of digital consent in your country) to use the App. By using the App you represent that you meet this requirement.",
  },
  {
    heading: "3. Your Account",
    body: "You may play as a guest or create an account. You are responsible for activity under your account and for keeping your credentials secure. Notify us promptly of any unauthorized use.",
  },
  {
    heading: "4. User Content & Acceptable Use",
    body: "You are solely responsible for content you provide, including any profile photo you upload. You must not upload or share content that is unlawful, sexually explicit, obscene, pornographic, hateful, harassing, violent, or that infringes the rights of others. We may screen, reject, remove, or refuse to store such content — including automatically — at any time and without notice.",
  },
  {
    heading: "5. License",
    body: "We grant you a personal, non-exclusive, non-transferable, revocable license to use the App for your personal, non-commercial use, subject to these Terms.",
  },
  {
    heading: "6. Privacy",
    body: "Your use of the App is also governed by our Privacy Policy, which explains what data we collect and how we use it. By accepting these Terms you acknowledge that policy.",
  },
  {
    heading: "7. Disclaimers",
    body: "The App is provided “as is” and “as available” without warranties of any kind, whether express or implied, to the fullest extent permitted by law.",
  },
  {
    heading: "8. Limitation of Liability",
    body: "To the maximum extent permitted by law, we are not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App.",
  },
  {
    heading: "9. Termination",
    body: "We may suspend or terminate your access to the App at any time if you violate these Terms. You may stop using the App at any time.",
  },
  {
    heading: "10. Changes to These Terms",
    body: "We may update these Terms from time to time. When we do, we will ask you to accept the updated version before continuing to use the App.",
  },
  {
    heading: "11. Contact",
    body: `Questions about these Terms? Contact us at ${LEGAL_CONTACT_EMAIL}.`,
  },
];

/** The scrollable body of the Terms & Conditions. Presentational only. */
export function TermsContent() {
  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        Effective {TERMS_EFFECTIVE_DATE}
      </ThemedText>

      {SECTIONS.map((section) => (
        <View key={section.heading} style={styles.section}>
          <ThemedText type="smallBold">{section.heading}</ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            {section.body}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.one,
  },
});
