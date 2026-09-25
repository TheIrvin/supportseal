import { prisma } from "@/lib/prisma";
import type { WorkspaceContext } from "@/lib/workspace";

export async function listSavedReplies(workspaceId: string) {
  return prisma.savedReply.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, body: true, updatedAt: true },
  });
}

export async function createSavedReply(input: {
  ctx: WorkspaceContext;
  name: string;
  body: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.ctx.role !== "ADMIN") {
    return { ok: false, error: "Only Workspace admins can manage saved replies." };
  }
  const name = input.name.trim().slice(0, 80);
  const body = input.body.trim().slice(0, 4000);
  if (!name || !body) return { ok: false, error: "A saved reply needs a name and a body." };
  try {
    await prisma.savedReply.create({
      data: {
        workspaceId: input.ctx.workspace.id,
        name,
        body,
        createdById: input.ctx.user.id,
      },
    });
  } catch {
    return { ok: false, error: "A saved reply with that name already exists." };
  }
  return { ok: true };
}

export async function updateSavedReply(input: {
  ctx: WorkspaceContext;
  id: string;
  name: string;
  body: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.ctx.role !== "ADMIN") {
    return { ok: false, error: "Only Workspace admins can manage saved replies." };
  }
  const name = input.name.trim().slice(0, 80);
  const body = input.body.trim().slice(0, 4000);
  if (!name || !body) return { ok: false, error: "A saved reply needs a name and a body." };
  const updated = await prisma.savedReply.updateMany({
    where: { id: input.id, workspaceId: input.ctx.workspace.id },
    data: { name, body },
  });
  if (updated.count === 0) return { ok: false, error: "Saved reply not found." };
  return { ok: true };
}

export async function deleteSavedReply(input: {
  ctx: WorkspaceContext;
  id: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.ctx.role !== "ADMIN") {
    return { ok: false, error: "Only Workspace admins can manage saved replies." };
  }
  const deleted = await prisma.savedReply.deleteMany({
    where: { id: input.id, workspaceId: input.ctx.workspace.id },
  });
  if (deleted.count === 0) return { ok: false, error: "Saved reply not found." };
  return { ok: true };
}
