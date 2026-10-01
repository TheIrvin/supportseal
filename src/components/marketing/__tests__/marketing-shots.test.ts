import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { MARKETING_SHOTS, SHOT_LIST_IDS } from "@/config/marketing-shots";

describe("marketing shot manifest", () => {
  it("declares every S-id from the design-doc shot list", () => {
    const ids = Object.keys(MARKETING_SHOTS);
    for (const id of SHOT_LIST_IDS) {
      expect(ids, `missing ${id}`).toContain(id);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("describes and dimensions every shot (aspect placeholders without CLS)", () => {
    for (const id of SHOT_LIST_IDS) {
      const entry = MARKETING_SHOTS[id];
      expect(entry.description.length, id).toBeGreaterThan(0);
      expect(entry.width).toBeGreaterThan(0);
      expect(entry.height).toBeGreaterThan(0);
    }
  });

  it("ships a light and dark file for every available capture", async () => {
    const available = Object.values(MARKETING_SHOTS).filter((shot) => shot.available);
    expect(available.length).toBeGreaterThan(0);
    const publicDir = path.join(process.cwd(), "public", "marketing");
    for (const shot of available) {
      for (const theme of ["light", "dark"] as const) {
        const file = path.join(publicDir, `${shot.id}-${theme}.png`);
        expect(existsSync(file), `${shot.id}-${theme}.png`).toBe(true);
      }
    }
  });

  it("matches every available PNG to its reserved manifest aspect ratio", async () => {
    const publicDir = path.join(process.cwd(), "public", "marketing");
    const pngSize = async (file: string) => {
      const buf = await readFile(file);
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    };
    for (const shot of Object.values(MARKETING_SHOTS).filter((s) => s.available)) {
      for (const theme of ["light", "dark"] as const) {
        const { width, height } = await pngSize(path.join(publicDir, `${shot.id}-${theme}.png`));
        expect(width, `${shot.id}-${theme}`).toBe(shot.width);
        expect(height, `${shot.id}-${theme}`).toBe(shot.height);
      }
    }
  });

  it("keeps unavailable shots limited to captures that need a second real product", () => {
    const unavailable = Object.values(MARKETING_SHOTS).filter((shot) => !shot.available);
    // S3 (a second product's widget) and S2m stay pending until a truthful
    // capture exists; nothing else may flip back to unavailable.
    expect(unavailable.map((shot) => shot.id).sort()).toEqual(["S2m", "S3"]);
  });
});
