import { prisma } from "@/lib/prisma";

/**
 * Usage metering and plan limits (FR-USE-01/02). A billable Conversation is
 * counted once ever — in the billing period (calendar month UTC) in which it
 * opened; replies, reopening and chat-to-email continuation never re-count.
 * The Conversations table IS the auditable ledger; this module derives usage
 * from it rather than maintaining a second event stream that could drift.
 */
export type PlanId = "free" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  monthlyConversations: number | null; // null = unlimited
  graceDays: number;
};

function envInt(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name]?.trim() ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    monthlyConversations: envInt("FREE_TIER_CONVERSATION_LIMIT", 100),
    graceDays: envInt("USAGE_GRACE_DAYS", 14),
  },
  pro: {
    id: "pro",
    name: "Pro",
    monthlyConversations: null,
    graceDays: 0,
  },
};

/** Plan ids allowed in hosted checkout (self-hosted never bills). */
export function hostedPlans(): Plan[] {
  return [PLANS.free, PLANS.pro];
}

export type UsageSummary = {
  plan: Plan;
  period: { start: Date; end: Date; label: string };
  conversationsOpened: number;
  conversationsCountedAllTime: number;
  limit: number | null;
  overLimit: boolean;
  graceEndsAt: Date | null;
  graceRemainingDays: number | null;
};

function periodBounds(now = new Date()): { start: Date; end: Date; label: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end, label: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}` };
}

/**
 * First month in which each conversation opened = the month it was counted.
 * Derived: conversations whose createdAt falls in this period AND that are
 * the conversation's own opening (createdAt is always the opening moment).
 */
export async function computeUsage(
  workspaceId: string,
  planId: PlanId = "free",
  now = new Date(),
): Promise<UsageSummary> {
  const plan = PLANS[planId];
  const period = periodBounds(now);
  const [inPeriod, allTime] = await Promise.all([
    prisma.conversation.count({
      where: { workspaceId, createdAt: { gte: period.start, lt: period.end } },
    }),
    prisma.conversation.count({ where: { workspaceId } }),
  ]);

  const limit = plan.monthlyConversations;
  const overLimit = limit !== null && inPeriod > limit;
  let graceEndsAt: Date | null = null;
  let graceRemainingDays: number | null = null;
  if (overLimit && plan.graceDays > 0) {
    // Grace runs from the first day the limit was exceeded. V1 derives it
    // from the period: the earliest moment usage could have passed the limit
    // is approximated by the period start + limit days spread; documented as
    // the period boundary + graceDays, which is deterministic and auditable.
    graceEndsAt = new Date(period.end.getTime() + plan.graceDays * 24 * 60 * 60 * 1000);
    graceRemainingDays = Math.max(
      0,
      Math.ceil((graceEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    );
  }

  return {
    plan,
    period,
    conversationsOpened: inPeriod,
    conversationsCountedAllTime: allTime,
    limit,
    overLimit,
    graceEndsAt,
    graceRemainingDays,
  };
}

/** FR-USE-02: never abruptly reject messages — usage never blocks intake. */
export function usageBlocksIntake(): false {
  return false;
}
