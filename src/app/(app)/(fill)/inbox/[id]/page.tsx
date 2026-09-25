import { notFound } from "next/navigation";

import { getConversationDetail, listTags } from "@/lib/conversations";
import { listSavedReplies } from "@/lib/saved-replies";
import { requireWorkspace } from "@/lib/workspace";
import { ConversationView } from "./conversation-view";

export const metadata = { title: "Conversation" };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireWorkspace(`/inbox/${id}`);

  const [conversation, tags, savedReplies] = await Promise.all([
    getConversationDetail({ workspaceId: ctx.workspace.id, conversationId: id }),
    listTags(ctx.workspace.id),
    listSavedReplies(ctx.workspace.id),
  ]);
  if (!conversation) notFound();

  return (
    <ConversationView
      conversation={{
        id: conversation.id,
        status: conversation.status,
        channel: conversation.channel,
        subject: conversation.subject,
        createdAt: conversation.createdAt.toISOString(),
        contact: {
          id: conversation.contact.id,
          name: conversation.contact.name,
          email: conversation.contact.email,
        },
        product: conversation.product,
        productArchived: false,
        tags: conversation.tags.map((t) => ({ id: t.tagId, name: t.tag.name })),
        messages: conversation.messages.map((message) => ({
          id: message.id,
          kind: message.kind,
          body: message.body,
          createdAt: message.createdAt.toISOString(),
          authorName: message.author?.name ?? null,
        })),
      }}
      availableTags={tags}
      savedReplies={savedReplies.map((r) => ({ id: r.id, name: r.name, body: r.body }))}
    />
  );
}
