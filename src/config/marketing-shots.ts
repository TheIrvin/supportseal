/**
 * Marketing screenshot manifest (docs/design/marketing-site.md, "Screenshots").
 *
 * Every product image is a real capture of the running app (no mockups).
 * The captures shipped here are from the live customer-zero onboarding
 * (2026-10-01): the Seal Labs workspace and its first Product, IndieDevTest
 * (indiedevtest.com), on https://supportseal.app. Light and dark variants
 * live at `public/marketing/<id>-<light|dark>.png` (file names never contain
 * the product name).
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

function shot(
  id: string,
  description: string,
  width: number,
  height: number,
  available = true,
): MarketingShot {
  return { id, description, available, width, height };
}

export const MARKETING_SHOTS: Record<string, MarketingShot> = {
  S1: shot(
    "S1",
    "Inbox, All Products scope: sidebar with the Product; conversation list with chat and email Conversations; context panel filled",
    1440,
    900,
  ),
  S1m: shot("S1m", "Mobile inbox list, All Products scope", 390, 844),
  S2: shot("S2", "Chat widget panel, IndieDevTest (lime), one live exchange", 384, 600),
  // Pending a second real Product: a pink widget capture cannot be truthful yet.
  S3: shot("S3", "Chat widget panel, second Product (pink), one live exchange", 384, 600, false),
  S2m: shot("S2m", "Chat widget open on a 390px viewport", 390, 844, false),
  S4: shot("S4", "Inbox scoped to IndieDevTest with its conversation list and open thread", 1440, 900),
  S5: shot("S5", "Context panel: identified member, their email and user id, app context and recorded page", 384, 560),
  S6: shot("S6", "Support email Conversation with a question and the reply sent from the inbox", 1440, 900),
  S7: shot("S7", "Widget in away mode, inviting a message that continues by email", 384, 600),
  S8: shot("S8", "Widget settings: embed snippet with its copy button", 1440, 900),
  S9: shot("S9", "Team settings: the workspace Admin and the invite form for Agents", 1440, 900),
  S10: shot("S10", "Hosted billing page: usage meter for the current period", 1440, 900),
  S11: shot("S11", "Conversation with note, tag and saved-reply picker open", 1440, 900),
  // The design shot list leaves the attachments crop unnamed ("crop of a
  // Conversation with a file"); it gets a manifest entry so the frame can
  // render a pending slot like every other capture.
  "S-attachments": shot("S-attachments", "Reply carrying an attached file with its name and size", 900, 640),
};

/** Full shot-list ids from the design doc, for completeness tests. */
export const SHOT_LIST_IDS = ["S1", "S1m", "S2", "S3", "S2m", "S4", "S5", "S6", "S7", "S8", "S9", "S10", "S11"];
