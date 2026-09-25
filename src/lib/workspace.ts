import { randomBytes } from "node:crypto";

import { redirect } from "next/navigation";

import { isHostedMode } from "@/lib/hosting";
import { prisma } from "@/lib/prisma";
import { getSessionUser, type SessionUser } from "@/lib/session";

export type MembershipRole = "ADMIN" | "AGENT";

export type WorkspaceContext = {
  user: SessionUser;
  workspace: { id: string; name: string; plan?: "FREE" | "PRO" };
  role: MembershipRole;
};

export const INVITE_EXPIRY_DAYS = 7;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** V1: one user account primarily belongs to one Workspace (Initial.md §4). */
export async function getPrimaryMembership(userId: string) {
  return prisma.membership.findFirst({
    where: { userId },
    include: { workspace: true },
  });
}

export async function createWorkspace(input: {
  userId: string;
  name: string;
}): Promise<{ ok: true; workspaceId: string } | { ok: false; error: string }> {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: "Workspace name must be between 2 and 80 characters." };
  }

  const existingMembership = await getPrimaryMembership(input.userId);
  if (existingMembership) {
    return {
      ok: false,
      error: "This account already belongs to a Workspace. V1 supports one Workspace per account.",
    };
  }

  if (!isHostedMode()) {
    const workspaceCount = await prisma.workspace.count();
    if (workspaceCount > 0) {
      return {
        ok: false,
        error:
          "This self-hosted deployment already has a Workspace. " +
          "A self-hosted installation serves exactly one Workspace (ADR-0001).",
      };
    }
  }

  const workspace = await prisma.$transaction(async (tx) => {
    const created = await tx.workspace.create({ data: { name } });
    await tx.membership.create({
      data: {
        userId: input.userId,
        workspaceId: created.id,
        role: "ADMIN",
      },
    });
    return created;
  });

  return { ok: true, workspaceId: workspace.id };
}

/** Resolve the caller's Workspace context or redirect into onboarding. */
export async function requireWorkspace(nextPath = "/inbox"): Promise<WorkspaceContext> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  const membership = await getPrimaryMembership(user.id);
  if (!membership) {
    redirect("/onboarding/create-workspace");
  }
  return {
    user,
    workspace: {
      id: membership.workspaceId,
      name: membership.workspace.name,
      plan: membership.workspace.plan,
    },
    role: membership.role,
  };
}

export async function createInvite(input: {
  workspaceId: string;
  actorUserId: string;
  actorRole: MembershipRole;
  email: string;
  role: MembershipRole;
}): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  if (input.actorRole !== "ADMIN") {
    return { ok: false, error: "Only Workspace admins can invite users." };
  }
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const existingMember = await prisma.membership.findFirst({
    where: { workspaceId: input.workspaceId, user: { email } },
  });
  if (existingMember) {
    return { ok: false, error: "That person is already a member of this Workspace." };
  }

  const pending = await prisma.invite.findFirst({
    where: {
      workspaceId: input.workspaceId,
      email,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (pending) {
    return { ok: false, error: "An invite for that email is already pending. Revoke it first." };
  }

  const token = randomBytes(24).toString("base64url");
  await prisma.invite.create({
    data: {
      workspaceId: input.workspaceId,
      email,
      role: input.role,
      token,
      invitedById: input.actorUserId,
      expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return { ok: true, token };
}

export type InviteStatus = "pending" | "accepted" | "expired";

export async function listInvites(workspaceId: string) {
  const invites = await prisma.invite.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
  return invites.map((invite) => ({
    ...invite,
    status: resolveInviteStatus(invite),
  }));
}

export function resolveInviteStatus(invite: {
  acceptedAt: Date | null;
  expiresAt: Date;
}): InviteStatus {
  if (invite.acceptedAt) return "accepted";
  if (invite.expiresAt.getTime() < Date.now()) return "expired";
  return "pending";
}

export async function revokeInvite(input: {
  workspaceId: string;
  actorRole: MembershipRole;
  inviteId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.actorRole !== "ADMIN") {
    return { ok: false, error: "Only Workspace admins can revoke invites." };
  }
  const invite = await prisma.invite.findFirst({
    where: { id: input.inviteId, workspaceId: input.workspaceId },
  });
  if (!invite) {
    return { ok: false, error: "Invite not found." };
  }
  await prisma.invite.delete({ where: { id: invite.id } });
  return { ok: true };
}

export async function getInviteByToken(token: string) {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { workspace: true },
  });
  if (!invite) return null;
  return { ...invite, status: resolveInviteStatus(invite) };
}

export async function acceptInvite(input: {
  token: string;
  userId: string;
  email: string;
}): Promise<{ ok: true; workspaceId: string } | { ok: false; error: string }> {
  const invite = await getInviteByToken(input.token);
  if (!invite || invite.status !== "pending") {
    return { ok: false, error: "This invite is no longer valid." };
  }
  if (invite.email !== normalizeEmail(input.email)) {
    return {
      ok: false,
      error: `This invite was sent to ${invite.email}. Sign in with that email address to accept it.`,
    };
  }
  const existingMembership = await getPrimaryMembership(input.userId);
  if (existingMembership) {
    if (existingMembership.workspaceId === invite.workspaceId) {
      return { ok: true, workspaceId: invite.workspaceId };
    }
    return {
      ok: false,
      error: "This account already belongs to a Workspace. V1 supports one Workspace per account.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.membership.create({
      data: {
        userId: input.userId,
        workspaceId: invite.workspaceId,
        role: invite.role,
      },
    });
    await tx.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  });

  return { ok: true, workspaceId: invite.workspaceId };
}

export async function listMembers(workspaceId: string) {
  return prisma.membership.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

/** Workspace-wide support availability (Pete: one Live/Away for all Products). */
export async function getAvailability(workspaceId: string): Promise<"LIVE" | "AWAY"> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { availability: true },
  });
  return workspace?.availability ?? "LIVE";
}

export async function setAvailability(input: {
  workspaceId: string;
  actorRole: MembershipRole;
  availability: "LIVE" | "AWAY";
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.actorRole !== "ADMIN") {
    return { ok: false, error: "Only Workspace admins can change support availability." };
  }
  await prisma.workspace.update({
    where: { id: input.workspaceId },
    data: { availability: input.availability },
  });
  return { ok: true };
}
