"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { format, isSameDay } from "date-fns";
import {
  IconArrowLeft,
  IconChevronDown,
  IconLock,
  IconMessage2,
  IconLayoutSidebarRight,
} from "@tabler/icons-react";

import { cn } from "@/lib/cn";
import { ProductChip } from "@/components/product-identity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@radix-ui/react-popover";

import { ContextSection } from "./context-section";
import { toast } from "sonner";
import { visitorLabel } from "../list-pane";
import { addTagAction, removeTagAction, sendMessageAction, setStatusAction } from "../actions";

type Message = {
  id: string;
  kind: "CUSTOMER" | "AGENT" | "NOTE";
  body: string;
  createdAt: string;
  authorName: string | null;
};

export type ConversationViewData = {
  id: string;
  status: "OPEN" | "PENDING" | "CLOSED";
  channel: "CHAT" | "EMAIL";
  subject: string | null;
  createdAt: string;
  contact: { id: string; name: string | null; email: string | null };
  product: { id: string; name: string; primaryColor: string };
  productArchived: boolean;
  tags: { id: string; name: string }[];
  messages: Message[];
};

export type DevContextProp = {
  identifiedUserId: string | null;
  entries: Array<{ key: string; value: string; updatedAt: string | null }>;
};

const STATUS_META = {
  OPEN: { label: "Open", color: "primary" as const },
  PENDING: { label: "Pending", color: "warning" as const },
  CLOSED: { label: "Closed", color: "secondary" as const },
};

function DaySeparator({ date }: { date: string }) {
  return (
    <div className="my-3 flex items-center gap-3" aria-hidden>
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted">{format(new Date(date), "EEE d MMM")}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function ConversationView({
  conversation,
  availableTags,
  savedReplies,
  devContext,
}: {
  conversation: ConversationViewData;
  availableTags: { id: string; name: string }[];
  savedReplies: { id: string; name: string; body: string }[];
  devContext: DevContextProp;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"REPLY" | "NOTE">("REPLY");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const lastLength = conversation.messages.length;

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastLength]);

  const contactLabel = useMemo(() => visitorLabel(conversation.contact), [conversation.contact]);

  async function send() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    const result = await sendMessageAction({
      conversationId: conversation.id,
      body: text,
      kind: mode === "NOTE" ? "NOTE" : "AGENT",
    });
    setSending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setBody("");
    startTransition(() => router.refresh());
  }

  function changeStatus(status: "OPEN" | "PENDING" | "CLOSED") {
    const previous = conversation.status;
    startTransition(async () => {
      const result = await setStatusAction({ conversationId: conversation.id, status });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast(`Moved to ${STATUS_META[status].label}`, {
        action: {
          label: "Undo",
          onClick: () => {
            void setStatusAction({ conversationId: conversation.id, status: previous }).then(() =>
              router.refresh(),
            );
          },
        },
      });
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
          <Button
            variant="text"
            color="secondary"
            size="sm"
            iconOnly
            className="lg:hidden"
            aria-label="Back to inbox"
            onClick={() => router.push("/inbox")}
          >
            <IconArrowLeft className="size-5" />
          </Button>
          <span className="min-w-0 truncate font-medium text-heading">{contactLabel}</span>
          <ProductChip
            name={conversation.product.name}
            color={conversation.product.primaryColor}
            className="hidden sm:inline-flex"
          />
          <div className="ms-auto flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="text" color="secondary" size="sm">
                  <Badge variant="light" color={STATUS_META[conversation.status].color}>
                    {STATUS_META[conversation.status].label}
                  </Badge>
                  <IconChevronDown className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(STATUS_META) as Array<keyof typeof STATUS_META>).map((status) => (
                  <DropdownMenuItem key={status} onSelect={() => changeStatus(status)}>
                    {STATUS_META[status].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {conversation.status !== "CLOSED" ? (
              <Button variant="solid" color="primary" size="sm" onClick={() => changeStatus("CLOSED")} disabled={pending}>
                Close
              </Button>
            ) : (
              <Button variant="solid" color="primary" size="sm" onClick={() => changeStatus("OPEN")} disabled={pending}>
                Reopen
              </Button>
            )}
            <Button
              variant="text"
              color="secondary"
              size="sm"
              iconOnly
              className="xl:hidden"
              aria-label="Show context"
              onClick={() => setContextOpen(true)}
            >
              <IconLayoutSidebarRight className="size-5" />
            </Button>
          </div>
        </header>

        <div
          ref={threadRef}
          className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4"
          role="log"
          aria-live="polite"
        >
          {conversation.messages.map((message, index) => {
            const previous = conversation.messages[index - 1];
            const showDay =
              !previous || !isSameDay(new Date(previous.createdAt), new Date(message.createdAt));
            return (
              <div key={message.id}>
                {showDay ? <DaySeparator date={message.createdAt} /> : null}
                <MessageBubble message={message} />
              </div>
            );
          })}
        </div>

        {conversation.productArchived ? (
          <div className="shrink-0 border-t border-border bg-secondary-label p-3 text-sm text-body">
            {conversation.product.name} is archived. Incoming email bounces and new chats are
            blocked. Unarchive it in Product settings to reply. Notes, tags and status changes
            still work.
          </div>
        ) : (
        <div
          className={cn(
            "shrink-0 border-t border-border p-3",
            mode === "NOTE" && "bg-warning-label",
          )}
        >
          <div className="mb-2 flex items-center gap-3">
            <div className="flex gap-1" role="tablist" aria-label="Composer mode">
              {(
                [
                  { id: "REPLY", label: "Reply" },
                  { id: "NOTE", label: "Note" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === tab.id}
                  onClick={() => setMode(tab.id)}
                  className={cn(
                    "-mb-px border-b-2 px-2 py-1 text-sm",
                    mode === tab.id
                      ? "border-primary font-medium text-heading"
                      : "border-transparent text-body hover:text-heading",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {mode === "NOTE" ? (
              <span className="flex items-center gap-1 text-xs text-warning">
                <IconLock className="size-3.5" />
                Internal note — never sent to the customer
              </span>
            ) : null}
            {savedReplies.length > 0 && mode === "REPLY" ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="text" size="xs" className="ms-auto">
                    <IconMessage2 className="size-4" />
                    Saved
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="z-50 w-80 rounded-lg border border-border bg-surface p-2 shadow-menu">
                  <ul className="max-h-72 overflow-y-auto">
                    {savedReplies.map((reply) => (
                      <li key={reply.id}>
                        <button
                          type="button"
                          className="w-full rounded-md px-2 py-2 text-left hover:bg-hover"
                          onClick={() => setBody((current) => (current ? current : reply.body))}
                        >
                          <span className="block text-sm font-medium text-heading">{reply.name}</span>
                          <span className="block truncate text-xs text-muted">{reply.body}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
            ) : null}
          </div>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void send();
              }
            }}
            rows={3}
            placeholder={
              mode === "NOTE"
                ? "Add an internal note (not sent to the customer)"
                : "Write a reply… (Ctrl+Enter to send)"
            }
            aria-label={mode === "NOTE" ? "Internal note" : `Reply to ${contactLabel}`}
            className="w-full resize-none rounded-md border border-border-strong bg-surface p-2.5 text-sm text-heading placeholder:text-muted focus-visible:outline-2 focus-visible:outline-primary"
          />
          <div className="mt-2 flex items-center gap-2">
            {conversation.status === "CLOSED" ? (
              <span className="text-xs text-muted">Sending reopens this conversation</span>
            ) : null}
            <Button
              className="ms-auto"
              size="sm"
              onClick={() => void send()}
              disabled={sending || !body.trim()}
            >
              {sending ? "Sending…" : mode === "NOTE" ? "Add note" : "Send"}
            </Button>
          </div>
        </div>
        )}
      </div>

      <aside className="hidden w-80 shrink-0 overflow-y-auto border-s border-border bg-surface xl:block">
        <ContextPanel
          conversation={conversation}
          contactLabel={contactLabel}
          availableTags={availableTags}
          devContext={devContext}
        />
      </aside>

      {contextOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-label="Conversation context">
          <div className="absolute inset-0 bg-black/40" onClick={() => setContextOpen(false)} />
          <div className="absolute inset-y-0 end-0 w-[22rem] max-w-full overflow-y-auto bg-surface p-4 shadow-menu">
            <button
              type="button"
              className="mb-2 text-sm text-primary"
              onClick={() => setContextOpen(false)}
            >
              Close
            </button>
            <ContextPanel
              conversation={conversation}
              contactLabel={contactLabel}
              availableTags={availableTags}
              devContext={devContext}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.kind === "NOTE") {
    return (
      <article
        aria-label={`Internal note by ${message.authorName ?? "agent"}`}
        className="rounded-lg bg-warning-label p-3"
      >
        <p className="flex items-center gap-1 text-xs font-medium text-warning">
          <IconLock className="size-3.5" />
          Internal note · {message.authorName ?? "Agent"}
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-heading">{message.body}</p>
      </article>
    );
  }

  const isAgent = message.kind === "AGENT";
  return (
    <article
      aria-label={`${isAgent ? message.authorName ?? "Agent" : "Customer"}, ${format(
        new Date(message.createdAt),
        "p",
      )}`}
      className={cn("flex", isAgent ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[min(85%,70ch)] rounded-lg p-3",
          isAgent ? "bg-primary-label" : "border border-border bg-surface",
        )}
      >
        {isAgent ? (
          <p className="text-xs font-medium text-primary">{message.authorName ?? "Agent"}</p>
        ) : null}
        <p className="whitespace-pre-wrap text-sm text-heading">{message.body}</p>
        <p className="mt-1 text-right text-[0.6875rem] text-muted">
          {format(new Date(message.createdAt), "p")}
        </p>
      </div>
    </article>
  );
}

function ContextPanel({
  conversation,
  contactLabel,
  availableTags,
  devContext,
}: {
  conversation: ConversationViewData;
  contactLabel: string;
  availableTags: { id: string; name: string }[];
  devContext: DevContextProp;
}) {
  const router = useRouter();
  const [tagName, setTagName] = useState("");

  async function addTag() {
    const name = tagName.trim();
    if (!name) return;
    setTagName("");
    await addTagAction({ conversationId: conversation.id, name });
    router.refresh();
  }

  return (
    <div className="space-y-5 p-4">
      <section>
        <h3 className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted">
          Customer
        </h3>
        <p className="mt-1 text-sm font-medium text-heading">{contactLabel}</p>
        {conversation.contact.email ? (
          <p className="text-sm text-body">{conversation.contact.email}</p>
        ) : (
          <p className="text-sm text-muted">Anonymous visitor</p>
        )}
        {devContext.identifiedUserId ? (
          <p className="mt-1 text-xs text-muted">
            Identified by {conversation.product.name} as user{" "}
            <code className="font-mono">{devContext.identifiedUserId}</code>
          </p>
        ) : null}
      </section>

      <ContextSection
        productName={conversation.product.name}
        entries={devContext.entries}
      />

      <section>
        <h3 className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted">Tags</h3>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {conversation.tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-md bg-secondary-label px-2 py-0.5 text-xs text-body"
            >
              {tag.name}
              <button
                type="button"
                aria-label={`Remove tag ${tag.name}`}
                className="text-muted hover:text-danger"
                onClick={() =>
                  void removeTagAction({ conversationId: conversation.id, tagId: tag.id }).then(() =>
                    router.refresh(),
                  )
                }
              >
                ×
              </button>
            </span>
          ))}
          {conversation.tags.length === 0 ? <span className="text-xs text-muted">None</span> : null}
        </div>
        <div className="mt-2 flex gap-1.5">
          <input
            value={tagName}
            onChange={(event) => setTagName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void addTag();
            }}
            list="workspace-tags"
            placeholder="Add tag…"
            className="h-8 flex-1 rounded-md border border-border-strong bg-surface px-2 text-sm"
            aria-label="Add tag"
          />
          <datalist id="workspace-tags">
            {availableTags.map((tag) => (
              <option key={tag.id} value={tag.name} />
            ))}
          </datalist>
        </div>
      </section>

      <section>
        <h3 className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted">
          Details
        </h3>
        <dl className="mt-1.5 space-y-1 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Product</dt>
            <dd className="text-body">{conversation.product.name}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Channel</dt>
            <dd className="text-body">{conversation.channel === "CHAT" ? "Chat" : "Email"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Created</dt>
            <dd className="text-body">{format(new Date(conversation.createdAt), "d MMM yyyy")}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
