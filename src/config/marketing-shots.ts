/**
 * Marketing screenshot manifest (docs/design/marketing-site.md, "Screenshots").
 *
 * Every product image must be a real capture of the running app (no mockups).
 * The demo seed the captures depend on is deferred work (open-questions M6),
 * so every shot starts `available: false` and `ScreenshotFrame` renders a
 * clearly marked placeholder slot instead. When a capture lands:
 *
 *   1. add the masters as `public/marketing/<id>-<light|dark>.png`
 *      (file names never contain the product name),
 *   2. flip `available` to true.
 *
 * `width`/`height` are the nominal capture sizes from the design doc and only
 * reserve the aspect ratio (no CLS).
 */
export type MarketingShot = {
  id: string;
  description: string;
  available: boolean;
  width: number;
  height: number;
};

function shot(id: string, description: string, width: number, height: number): MarketingShot {
  return { id, description, available: false, width, height };
}

export const MARKETING_SHOTS: Record<string, MarketingShot> = {
  S1: shot(
    "S1",
    "Inbox, All Products scope: sidebar with 3 Products; list with chat and email Conversations; context panel filled",
    1440,
    900,
  ),
  S1m: shot("S1m", "Mobile inbox list, All Products scope", 390, 844),
  S2: shot("S2", "Chat widget panel, Product A (blue), one live exchange", 384, 600),
  S3: shot("S3", "Chat widget panel, Product B (pink), one live exchange", 384, 600),
  S2m: shot("S2m", "Chat widget open on a 390px viewport", 390, 844),
  S4: shot("S4", "Inbox scoped to Product A with filtered list", 1440, 900),
  S5: shot("S5", "Context panel: identified user, plan, version, page URL, admin link", 384, 560),
  S6: shot("S6", "Conversation continued from chat to email with an email reply", 1440, 900),
  S7: shot("S7", "Widget in away mode: message form with email field", 384, 600),
  S8: shot("S8", "Onboarding install step: snippet with copy button and test-page link", 1440, 900),
  S9: shot("S9", "Team settings with Admin and Agent roles", 1440, 900),
  S10: shot("S10", "Hosted billing page: usage meter for the current period", 1440, 900),
  S11: shot("S11", "Conversation with note, tag and saved-reply picker open", 1440, 900),
};

/** Full shot-list ids from the design doc, for completeness tests. */
export const SHOT_LIST_IDS = ["S1", "S1m", "S2", "S3", "S2m", "S4", "S5", "S6", "S7", "S8", "S9", "S10", "S11"];
