import { describe, expect, it } from "vitest";

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

  it("starts fully unavailable until real captures exist (open question M6)", () => {
    const available = Object.values(MARKETING_SHOTS).filter((shot) => shot.available);
    expect(available).toEqual([]);
  });
});
