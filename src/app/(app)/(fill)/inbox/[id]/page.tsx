import { notFound } from "next/navigation";

import { countFailedOutboundDeliveries, getConversationDetail, listTags } from "@/lib/conversations";
import { orderContextForDisplay } from "@/lib/dev-context";
import { hasExpiredSnapshotsForConversation, listSnapshotsForConversation } from "@/lib/diagnostics/store";
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

  const [conversation, tags, savedReplies, failedDeliveries] = await Promise.all([
    getConversationDetail({ workspaceId: ctx.workspace.id, conversationId: id }),
    listTags(ctx.workspace.id),
    listSavedReplies(ctx.workspace.id),
    countFailedOutboundDeliveries(id),
  ]);
  if (!conversation) notFound();

  const [snapshots, hasExpired] = await Promise.all([
    listSnapshotsForConversation(ctx.workspace.id, conversation.id),
    hasExpiredSnapshotsForConversation(ctx.workspace.id, conversation.id),
  ]);
  const snapshotsByMessage = new Map(snapshots.map((snapshot) => [snapshot.messageId, snapshot]));

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
        product: {
          id: conversation.product.id,
          name: conversation.product.name,
          primaryColor: conversation.product.primaryColor,
        },
        productArchived: conversation.product.archivedAt !== null,
        tags: conversation.tags.map((t) => ({ id: t.tagId, name: t.tag.name })),
        messages: conversation.messages.map((message) => ({
          id: message.id,
          kind: message.kind,
          body: message.body,
          createdAt: message.createdAt.toISOString(),
          authorName: message.author?.name ?? null,
          attachments: message.attachments.map((a) => ({
            id: a.id,
            filename: a.filename,
            contentType: a.contentType,
            size: a.size,
          })),
          diagnostics: snapshotsByMessage.has(message.id)
            ? (() => {
                const snapshot = snapshotsByMessage.get(message.id)!;
                return {
                  errorCount: snapshot.errorCount,
                  warningCount: snapshot.warningCount,
                  networkFailureCount: snapshot.networkFailureCount,
                };
              })()
            : null,
        })),
      }}
      availableTags={tags}
      savedReplies={savedReplies.map((r) => ({ id: r.id, name: r.name, body: r.body }))}
      failedDeliveryCount={failedDeliveries}
      devContext={{
        identifiedUserId: conversation.chatVisitors[0]?.externalUserId ?? null,
        entries: orderContextForDisplay(
          (conversation.chatVisitors[0]?.devContext as Record<string, unknown> | null) ?? {},
        ).map((entry) => ({
          key: entry.key,
          value:
            typeof entry.value === "object" && entry.value !== null
              ? JSON.stringify(entry.value)
              : String(entry.value ?? ""),
          updatedAt: ((conversation.chatVisitors[0]?.devContext as Record<string, unknown> | null)
            ?.updatedAt as string | undefined) ?? null,
        })),
      }}
      diagnostics={{
        enabled: conversation.product.diagnosticsEnabledAt !== null,
        hasExpired,
        snapshots: snapshots.map((snapshot) => ({
          id: snapshot.id,
          messageId: snapshot.messageId,
          createdAt: snapshot.createdAt.toISOString(),
          errorCount: snapshot.errorCount,
          warningCount: snapshot.warningCount,
          networkFailureCount: snapshot.networkFailureCount,
          droppedCount: snapshot.droppedCount,
          environment: snapshot.environment,
          events: snapshot.events,
        })),
      }}
    />
  );
}
