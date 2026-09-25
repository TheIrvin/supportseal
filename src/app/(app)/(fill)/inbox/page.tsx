export const metadata = { title: "Inbox" };

import { IconMessages } from "@tabler/icons-react";

import { EmptyState } from "@/components/ui/empty-state";

export default function InboxPage() {
  return (
    <div className="hidden min-h-0 flex-1 items-center justify-center lg:flex">
      <EmptyState
        icon={IconMessages}
        title="Select a conversation"
        description="Pick a conversation on the left to read and reply. New chats and emails arrive at the top of the list."
        className="max-w-sm"
      />
    </div>
  );
}
