import {
  ALLOWANCE_APPROACHING_THRESHOLD,
  formatCount,
  planForWorkspace,
} from "@/config/pricing";
import { appConfig } from "@/lib/config";
import { sendSystemEmail } from "@/lib/email/outbound";
import { isHostedMode } from "@/lib/hosting";
import { prisma } from "@/lib/prisma";
import { computeUsage } from "@/lib/usage";

/**
 * Admin allowance emails (FR-USE-02). One email per level (approaching at
 * ALLOWANCE_APPROACHING_THRESHOLD, then exceeded) per Workspace per period.
 * The `usage_notifications` row is written first and is both the dedupe key
 * and the audit record; when a send genuinely fails the row is deleted again
 * so the next conversation retries the level (at-least-once). Record-only
 * mode (no SMTP) keeps the row, matching reply-email dev semantics.
 * Delivery failures are logged and never block intake.
 */

export type AllowanceNotificationStatus =
  | { status: "skipped" } // self-hosted: no hosted allowance
  | { status: "none" } // below the approaching threshold (or unlimited)
  | { status: "deduped"; level: AllowanceLevel } // already notified this period
  | { status: "send-failed"; level: AllowanceLevel; emailed: number } // row reset; retries next conversation
  | { status: "notified"; level: AllowanceLevel; emailed: number };

export type AllowanceLevel = "APPROACHING" | "EXCEEDED";

function levelFor(input: {
  limit: number | null;
  conversationsOpened: number;
  overLimit: boolean;
}): AllowanceLevel | null {
  if (input.limit === null) return null;
  if (input.overLimit) return "EXCEEDED";
  if (input.conversationsOpened >= input.limit * ALLOWANCE_APPROACHING_THRESHOLD) {
    return "APPROACHING";
  }
  return null;
}

function emailText(input: {
  workspaceName: string;
  planName: string;
  opened: number;
  limit: number;
  graceDays: number;
  level: AllowanceLevel;
}): string {
  const billingUrl = `${appConfig.url}/settings/billing`;
  const over = input.level === "EXCEEDED";
  return [
    `${input.workspaceName} has ${over ? "exceeded" : "approached"} its ${input.planName} plan Conversation allowance.`,
    ``,
    `New Conversations this period: ${formatCount(input.opened)} of ${formatCount(input.limit)} (a Conversation counts once, in the period it opens).`,
    ``,
    `Customer messages keep flowing: going over the allowance never blocks support intake, never upgrades your plan automatically and never causes a surprise bill.`,
    over
      ? `A ${input.graceDays}-day grace window applies from the crossing. If this volume is sustained, arrange a higher-volume plan.`
      : `If you go over, a ${input.graceDays}-day grace window applies while messages keep arriving.`,
    ``,
    `View usage and plan options: ${billingUrl}`,
  ].join("\n");
}

/**
 * Compute usage, and when a threshold is newly crossed notify all Workspace
 * admins by email once per level per period. Hosted mode only — self-hosted
 * deployments have no hosted Conversation allowance (FR-HOST-01).
 */
export async function maybeNotifyAllowance(input: {
  workspaceId: string;
  now?: Date;
}): Promise<AllowanceNotificationStatus> {
  if (!isHostedMode()) return { status: "skipped" };

  const workspace = await prisma.workspace.findUnique({
    where: { id: input.workspaceId },
    select: { name: true, plan: true },
  });
  if (!workspace) return { status: "skipped" };

  const plan = planForWorkspace(workspace.plan);
  const usage = await computeUsage(input.workspaceId, plan.id, input.now);
  const level = levelFor({
    limit: usage.limit,
    conversationsOpened: usage.conversationsOpened,
    overLimit: usage.overLimit,
  });
  if (!level || usage.limit === null) return { status: "none" };

  // Dedupe + audit row first: concurrent conversation creates notify once.
  try {
    await prisma.usageNotification.create({
      data: { workspaceId: input.workspaceId, period: usage.period.label, level },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { status: "deduped", level };
    }
    throw error;
  }

  const admins = await prisma.membership.findMany({
    where: { workspaceId: input.workspaceId, role: "ADMIN" },
    include: { user: { select: { email: true } } },
  });
  const subject = `${workspace.name}: ${
    level === "EXCEEDED" ? "over" : "approaching"
  } your ${usage.plan.name} Conversation allowance (${usage.period.label})`;
  const text = emailText({
    workspaceName: workspace.name,
    planName: usage.plan.name,
    opened: usage.conversationsOpened,
    limit: usage.limit,
    graceDays: plan.graceDays,
    level,
  });

  let emailed = 0;
  let failures = 0;
  for (const admin of admins) {
    const result = await sendSystemEmail({ to: admin.user.email, subject, text });
    if (result.ok) emailed += 1;
    else {
      failures += 1;
      console.error(`allowance notification to ${admin.user.email} failed: ${result.error}`);
    }
  }
  if (failures > 0) {
    // Drop the dedupe row so the next conversation in this period retries the
    // level (at-least-once delivery; a retried level may re-mail an admin
    // who already received it). Record-only mode (no SMTP configured) is
    // `ok: true` and keeps the row, matching the reply-email dev semantics.
    await prisma.usageNotification
      .delete({
        where: { workspaceId_period_level: { workspaceId: input.workspaceId, period: usage.period.label, level } },
      })
      .catch((error) => {
        console.error(`failed to reset allowance notification row for retry:`, error);
      });
    return { status: "send-failed", level, emailed };
  }
  return { status: "notified", level, emailed };
}

/**
 * Fire-and-forget wrapper for intake paths (conversation creation): the
 * notification is auxiliary and must never block or fail message intake
 * (FR-USE-02). Errors are logged, not swallowed silently.
 */
export function notifyAllowanceInBackground(workspaceId: string): void {
  void maybeNotifyAllowance({ workspaceId }).catch((error) => {
    console.error(`allowance notification for workspace ${workspaceId} failed:`, error);
  });
}
