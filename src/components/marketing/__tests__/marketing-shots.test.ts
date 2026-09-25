import { describe, expect, it } from "vitest";

import { MARKETING_SHOTS, SHOT_LIST_IDS } from "@/config/marketing-shots";

describe("marketing shot manifest", () => {
  it("declares every S-id from the design-doc shot list", () => {
    expect(Object.keys(MARKETING_SHOTS).sort()).toEqual([...SHOT_LIST_IDS].sort());
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
    const available = SHOT_LIST_IDS.filter((id) => MARKETING_SHOTS[id].available);
    expect(available).toEqual([]);
  });
});
