#!/usr/bin/env node
/**
 * E2E app-server bootstrap, used as the Playwright webServer command.
 * Builds a throwaway environment for one suite run and then keeps
 * `next dev` alive as a child process:
 *
 *   1. wipe the run directory (database file + uploads + fixtures)
 *   2. replay prisma migrations onto a fresh file-backed PGlite database
 *   3. (hosted) seed the cross-Workspace fixtures
 *   4. spawn `next dev` with the run's env; forward signals so Playwright
 *      can stop the whole tree.
 *
 * Env (set by the playwright configs):
 *   E2E_MODE       hosted | selfhosted
 *   E2E_PORT       app port (3000 hosted, 3200 selfhosted)
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const MODE = process.env.E2E_MODE === "selfhosted" ? "selfhosted" : "hosted";
const PORT = process.env.E2E_PORT || (MODE === "selfhosted" ? "3200" : "3100");
const RUN_DIR = path.join(process.cwd(), "tests", "e2e", ".runtime", MODE);
const DATA_DIR = path.join(RUN_DIR, "data");
const FIXTURES_FILE = path.join(RUN_DIR, "fixtures.json");
const SHARED_SECRET = "e2e-shared-secret-0123456789abcdef";

const appEnv = {
  ...process.env,
  DATABASE_URL: "",
  PGLITE_PATH: path.join(DATA_DIR, "pglite.db"),
  STORAGE_DIR: path.join(DATA_DIR, "uploads"),
  NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
  BETTER_AUTH_SECRET: SHARED_SECRET,
  INBOUND_WEBHOOK_SECRET: SHARED_SECRET,
  INBOUND_EMAIL_DOMAIN: "inbound.localhost",
  ...(MODE === "hosted" ? { HOSTED_MODE: "1", SMTP_URL: "smtp://127.0.0.1:1025" } : { HOSTED_MODE: "" }),
};

async function main() {
  await fs.rm(RUN_DIR, { recursive: true, force: true });
  await fs.mkdir(DATA_DIR, { recursive: true });

  const migrate = spawnSync(process.execPath, ["scripts/dev-db.mjs"], {
    env: appEnv,
    stdio: "inherit",
  });
  if (migrate.status !== 0) {
    console.error(`[e2e-bootstrap] migrations failed (exit ${migrate.status})`);
    process.exit(1);
  }

  if (MODE === "hosted") {
    const seed = spawnSync("npx", ["tsx", "tests/e2e/seed.ts"], {
      env: { ...appEnv, E2E_FIXTURES_FILE: FIXTURES_FILE },
      stdio: "inherit",
    });
    if (seed.status !== 0) {
      console.error(`[e2e-bootstrap] seed failed (exit ${seed.status})`);
      process.exit(1);
    }
  }

  console.log(`[e2e-bootstrap] starting next dev (${MODE}) on :${PORT}`);
  const child = spawn("npx", ["next", "dev", "--port", PORT], { env: appEnv, stdio: "inherit" });

  const forward = (signal) => {
    child.kill(signal);
  };
  process.on("SIGTERM", () => forward("SIGTERM"));
  process.on("SIGINT", () => forward("SIGINT"));
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
