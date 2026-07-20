export type BoardThemeKey = "ocean" | "walnut" | "slate" | "green";

export interface BoardPalette {
  light: string;
  dark: string;
  selected: string;
  lastMove: string;
  check: string;
}

export const BOARD_THEMES: Record<BoardThemeKey, BoardPalette> = {
  ocean: {
    light: "#DEE7F0",
    dark: "#6E92B8",
    selected: "rgba(255, 214, 92, 0.55)",
    lastMove: "rgba(255, 214, 92, 0.38)",
    check: "rgba(232, 66, 66, 0.65)",
  },
  walnut: {
    light: "#F0D9B5",
    dark: "#B58863",
    selected: "rgba(255, 255, 51, 0.5)",
    lastMove: "rgba(255, 255, 51, 0.35)",
    check: "rgba(232, 66, 66, 0.65)",
  },
  slate: {
    light: "#E6E8EC",
    dark: "#8894A3",
    selected: "rgba(255, 214, 92, 0.55)",
    lastMove: "rgba(255, 214, 92, 0.4)",
    check: "rgba(232, 66, 66, 0.65)",
  },
  green: {
    light: "#EEEED2",
    dark: "#6F9350",
    selected: "rgba(255, 255, 51, 0.5)",
    lastMove: "rgba(255, 255, 51, 0.35)",
    check: "rgba(232, 66, 66, 0.6)",
  },
};

export const BOARD_THEME_OPTIONS: { value: BoardThemeKey; label: string }[] = [
  { value: "ocean", label: "Ocean" },
  { value: "walnut", label: "Walnut" },
  { value: "slate", label: "Slate" },
  { value: "green", label: "Green" },
];
