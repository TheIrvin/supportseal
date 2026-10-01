import { describe, expect, it } from "vitest";
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

  it("ships a light and dark PNG at the reserved aspect ratio for every available capture", async () => {
    const available = Object.values(MARKETING_SHOTS).filter((shot) => shot.available);
    expect(available.length).toBeGreaterThan(0);
    const publicDir = path.join(process.cwd(), "public", "marketing");
    for (const shot of available) {
      for (const theme of ["light", "dark"] as const) {
        const label = `${shot.id}-${theme}`;
        const buf = await readFile(path.join(publicDir, `${label}.png`));
        // PNG IHDR: width and height are big-endian uint32s at offsets 16 and 20.
        expect(buf.readUInt32BE(16), label).toBe(shot.width);
        expect(buf.readUInt32BE(20), label).toBe(shot.height);
      }
    }
  });

  it("keeps unavailable shots to captures that need a second real product or a mobile pass", () => {
    const unavailable = Object.values(MARKETING_SHOTS).filter((shot) => !shot.available);
    // S3 (a second product's widget) and S2m (mobile widget) stay pending
    // until a truthful capture exists; nothing else may flip back.
    expect(unavailable.map((shot) => shot.id).sort()).toEqual(["S2m", "S3"]);
  });
});
