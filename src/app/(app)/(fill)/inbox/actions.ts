"use server";

import { revalidatePath } from "next/cache";

import { deliverAgentReplyIfRouted } from "@/lib/email/routing";

import {
  addAgentMessage,
  setConversationStatus,
  tagConversation,
  untagConversation,
} from "@/lib/conversations";
import { requireWorkspace } from "@/lib/workspace";

const MESSAGE_KINDS = ["AGENT", "NOTE"] as const;
const CONVERSATION_STATUSES = ["OPEN", "PENDING", "CLOSED"] as const;

function isOneOf<T extends string>(value: string, allowed: readonly T[]): value is T {
  return allowed.some((item) => item === value);
}

export async function sendMessageAction(input: {
  conversationId: string;
  body: string;
  kind: string;
  attachmentIds?: string[];
}): Promise<{ error?: string }> {
  if (!isOneOf(input.kind, MESSAGE_KINDS)) {
    return { error: "Invalid message kind." };
  }
  const ctx = await requireWorkspace(`/inbox/${input.conversationId}`);
  const result = await addAgentMessage({
    ctx,
    conversationId: input.conversationId,
    body: input.body,
    kind: input.kind,
    attachmentIds: input.attachmentIds,
  });
  if (!result.ok) return { error: result.error };
  if (input.kind === "AGENT") {
    // Best-effort email continuation (routing rule D5); failures are
    // recorded on the delivery and never block the chat thread.
    await deliverAgentReplyIfRouted({
      workspaceId: ctx.workspace.id,
      conversationId: input.conversationId,
      messageId: result.messageId,
    }).catch(() => undefined);
  }
  revalidatePath(`/inbox/${input.conversationId}`);
  revalidatePath("/inbox");
  return {};
}

export async function setStatusAction(input: {
  conversationId: string;
  status: string;
}): Promise<{ error?: string }> {
  if (!isOneOf(input.status, CONVERSATION_STATUSES)) {
    return { error: "Invalid status." };
  }
  const ctx = await requireWorkspace(`/inbox/${input.conversationId}`);
  const result = await setConversationStatus({
    ctx,
    conversationId: input.conversationId,
    status: input.status,
  });
  if (!result.ok) return { error: result.error };
  revalidatePath(`/inbox/${input.conversationId}`);
  revalidatePath("/inbox");
  return {};
}

export async function addTagAction(input: { conversationId: string; name: string }): Promise<{ error?: string }> {
  const ctx = await requireWorkspace(`/inbox/${input.conversationId}`);
  const result = await tagConversation({
    ctx,
    conversationId: input.conversationId,
    name: input.name,
  });
  if (!result.ok) return { error: result.error };
  revalidatePath(`/inbox/${input.conversationId}`);
  return {};
}

export async function removeTagAction(input: { conversationId: string; tagId: string }): Promise<{ error?: string }> {
  const ctx = await requireWorkspace(`/inbox/${input.conversationId}`);
  const result = await untagConversation({
    ctx,
    conversationId: input.conversationId,
    tagId: input.tagId,
  });
  if (!result.ok) return { error: result.error };
  revalidatePath(`/inbox/${input.conversationId}`);
  return {};
}
