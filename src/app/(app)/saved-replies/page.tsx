import { requireWorkspace } from "@/lib/workspace";

export const metadata = { title: "Saved replies" };

export default async function SavedRepliesPage() {
  const ctx = await requireWorkspace("/saved-replies");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-heading">Saved replies</h1>
        <p className="mt-1 text-muted">
          Reusable answers your whole team can insert. Signed in to {ctx.workspace.name}.
        </p>
      </header>
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="font-medium text-heading">Saved replies arrive with the inbox slice</p>
        <p className="mt-1 text-sm text-muted">
          Admins will manage them here; every agent inserts them while replying.
        </p>
      </div>
    </div>
  );
}
