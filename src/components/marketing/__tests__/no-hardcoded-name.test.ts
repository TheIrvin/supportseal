import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Initial.md §58 / docs/design/marketing-site.md: the product name never
 * appears as a literal in marketing components or pages — it renders from
 * siteConfig.name so a rename is a config change. (Repository URLs contain
 * the lowercase project slug, which this check does not flag.)
 */
const ROOT = path.resolve(__dirname, "../../../..");

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "__tests__" || entry === "node_modules") continue;
      out.push(...collectFiles(full));
    } else if (/\.(tsx?|css)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("marketing pages never hard-code the product name", () => {
  it("uses siteConfig.name instead of a literal brand name", () => {
    const dirs = ["src/components/marketing", "src/app/(marketing)"].map((dir) => path.join(ROOT, dir));
    const offenders: string[] = [];
    for (const dir of dirs) {
      for (const file of collectFiles(dir)) {
        const content = readFileSync(file, "utf8");
        // `SupportSealWidget` is the shipped widget API global
        // (src/app/api/widget/js/route.ts) and must appear verbatim in code
        // samples; the brand name itself never appears as a literal.
        if (/SupportSeal(?!Widget)/.test(content)) offenders.push(path.relative(ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
