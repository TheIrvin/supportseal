import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { appConfig } from "@/lib/config";
import { resolvePrisma } from "@/lib/prisma";

function createAuth() {
  return betterAuth({
    // The signing secret comes from BETTER_AUTH_SECRET (read automatically);
    // production refuses to boot without it — see getAuth().
    baseURL: appConfig.url,
    trustedOrigins: [appConfig.url],
    database: prismaAdapter(resolvePrisma(), { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

let authInstance: Auth | undefined;

/**
 * Authentication instance (ADR-0002): better-auth with the Prisma adapter,
 * email/password credentials and database-backed sessions. Constructed
 * lazily because the Prisma client must resolve first (dev PGlite) and
 * `next build` loads route modules without a database.
 */
export async function getAuth(): Promise<Auth> {
  if (process.env.NODE_ENV === "production" && !process.env.BETTER_AUTH_SECRET?.trim()) {
    throw new Error("BETTER_AUTH_SECRET is required in production");
  }
  authInstance ??= createAuth();
  return authInstance;
}
