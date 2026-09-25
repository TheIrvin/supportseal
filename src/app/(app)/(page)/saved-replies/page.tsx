import { listSavedReplies } from "@/lib/saved-replies";
import { requireWorkspace } from "@/lib/workspace";
import { SavedReplyForm } from "./saved-reply-form";
import { SavedRepliesTable } from "./saved-replies-table";

export const metadata = { title: "Saved replies" };

export default async function SavedRepliesPage() {
  const ctx = await requireWorkspace("/saved-replies");
  const replies = await listSavedReplies(ctx.workspace.id);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-heading">Saved replies</h1>
        <p className="mt-1 text-muted">
          Reusable answers the whole team inserts while replying. Admins manage them here.
        </p>
      </header>

      {replies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="font-medium text-heading">No saved replies yet</p>
          <p className="mt-1 text-sm text-muted">
            Add your first one below — good candidates: refund policy, billing cycle, API status.
          </p>
        </div>
      ) : (
        <SavedRepliesTable replies={replies} isAdmin={ctx.role === "ADMIN"} />
      )}

      {ctx.role === "ADMIN" ? <SavedReplyForm /> : null}
    </div>
  );
}
