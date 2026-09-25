export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (!process.env.DATABASE_URL?.trim() && process.env.NODE_ENV !== "production") {
    const { initDevDb } = await import("@/lib/dev-pglite");
    await initDevDb();
  }
}
