const TOKEN_KEYS = [
  "primary",
  "primary-dark",
  "primary-light",
  "success",
  "danger",
  "warning",
  "info",
  "secondary",
  "heading",
  "body",
  "muted",
  "border",
  "surface",
  "body-bg",
] as const;

export type ThemeColorKey = (typeof TOKEN_KEYS)[number];

export type ThemeColors = Record<ThemeColorKey, string>;

const FALLBACK: ThemeColors = {
  primary: "#7367f0",
  "primary-dark": "#675dd8",
  "primary-light": "#8f85f3",
  success: "#28c76f",
  danger: "#ea5455",
  warning: "#ff9f43",
  info: "#00cfe8",
  secondary: "#a8aaae",
  heading: "#5d596c",
  body: "#6f6b7d",
  muted: "#a5a3ae",
  border: "#dbdade",
  surface: "#ffffff",
  "body-bg": "#f8f7fa",
};

export function readCssVar(name: string, fallback = ""): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

export function readThemeColors(): ThemeColors {
  return TOKEN_KEYS.reduce((acc, key) => {
    acc[key] = readCssVar(`--vx-${key}`, FALLBACK[key]);
    return acc;
  }, {} as ThemeColors);
}
