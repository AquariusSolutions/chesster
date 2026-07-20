import { useColorScheme } from "react-native";

import { useAppSelector } from "@/store/hooks";

/**
 * The effective color scheme: the user's explicit preference when set,
 * otherwise the system scheme.
 */
export function useResolvedScheme(): "light" | "dark" {
  const system = useColorScheme();
  const preference = useAppSelector((s) => s.settings.themePreference);
  if (preference === "light" || preference === "dark") return preference;
  return system === "dark" ? "dark" : "light";
}
