"use server";

import { revalidatePath } from "next/cache";

import {
  addAgentMessage,
  setConversationStatus,
  tagConversation,
  untagConversation,
} from "@/lib/conversations";
import { requireWorkspace } from "@/lib/workspace";

export async function sendMessageAction(input: {
  conversationId: string;
  body: string;
  kind: "AGENT" | "NOTE";
}): Promise<{ error?: string }> {
  const ctx = await requireWorkspace(`/inbox/${input.conversationId}`);
  const result = await addAgentMessage({
    ctx,
    conversationId: input.conversationId,
    body: input.body,
    kind: input.kind,
  });
  if (!result.ok) return { error: result.error };
  revalidatePath(`/inbox/${input.conversationId}`);
  revalidatePath("/inbox");
  return {};
}

export async function setStatusAction(input: {
  conversationId: string;
  status: "OPEN" | "PENDING" | "CLOSED";
}): Promise<{ error?: string }> {
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
