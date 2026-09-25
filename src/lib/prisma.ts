import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { PRISMA_TEST_CLIENT_GLOBAL_KEY } from "@/lib/prisma-constants";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  __supportseal_prisma_init: Promise<PrismaClient> | undefined;
};

const PGLITE_PATH = ".dev-data/pglite.db";

let cached: PrismaClient | undefined;
let initPromise: Promise<PrismaClient> | undefined;

/**
 * Dev convenience database: a file-backed PGlite instance at
 * .dev-data/pglite.db, used when DATABASE_URL is unset and NODE_ENV is not
 * production. Run `npm run db:dev` (or `npm test`) to apply migrations.
 * Production and any environment with DATABASE_URL always use Postgres.
 */
async function createDevPgliteClient(): Promise<PrismaClient> {
  const [{ PGlite }, { PrismaPGlite }, { mkdir }, path] = await Promise.all([
    import("@electric-sql/pglite"),
    import("pglite-prisma-adapter"),
    import("node:fs/promises"),
    import("node:path"),
  ]);
  await mkdir(path.dirname(PGLITE_PATH), { recursive: true });
  const pglite = new PGlite(PGLITE_PATH);
  await pglite.waitReady;
  return new PrismaClient({ adapter: new PrismaPGlite(pglite) });
}

async function resolveClient(): Promise<PrismaClient> {
  const testClient = (globalThis as Record<string, unknown>)[PRISMA_TEST_CLIENT_GLOBAL_KEY] as
    | PrismaClient
    | undefined;
  if (testClient) return testClient;
  if (cached) return cached;
  if (initPromise) return initPromise;

  const connectionString = process.env.DATABASE_URL?.trim();
  if (connectionString) {
    cached = new PrismaClient({ adapter: new PrismaPg(connectionString) });
    return cached;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production");
  }

  initPromise = createDevPgliteClient().then((client) => {
    globalForPrisma.prisma = client;
    cached = client;
    initPromise = undefined;
    return client;
  });
  return initPromise;
}

/**
 * Lazily creates the client on first property access so `next build` can load
 * route modules (which import `prisma`) without a database until a handler
 * actually runs.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return function proxied(...args: unknown[]) {
      return resolveClient().then((client) => {
        const value = (client as unknown as Record<string | symbol, unknown>)[prop];
        return typeof value === "function" ? value.apply(client, args) : value;
      });
    };
  },
});
