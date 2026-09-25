import { requireWorkspace } from "@/lib/workspace";

export const metadata = { title: "Inbox" };

export default async function InboxPage() {
  const ctx = await requireWorkspace("/inbox");

  return (
    <main className="flex min-h-screen items-center justify-center bg-body-bg p-6">
      <div className="max-w-md space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-heading">Inbox</h1>
        <p className="text-muted">
          Signed in to {ctx.workspace.name} ({ctx.role.toLowerCase()}). The unified inbox arrives
          with the conversation slice.
        </p>
      </div>
    </main>
  );
}
