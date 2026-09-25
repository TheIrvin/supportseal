export const appConfig = {
  url: (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000").replace(/\/$/, ""),
} as const;
