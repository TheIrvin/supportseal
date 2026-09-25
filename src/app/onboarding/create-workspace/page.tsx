import Link from "next/link";

import { CreateWorkspaceForm } from "./create-workspace-form";
import { Logo } from "@/components/layout/logo";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Create your Workspace" };

export default async function CreateWorkspacePage() {
  await requireUser("/onboarding/create-workspace");

  return (
    <main className="flex min-h-screen items-center justify-center bg-body-bg p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <CreateWorkspaceForm />
        <p className="text-center text-sm text-muted">
          Invited by your team?{" "}
          <Link href="/inbox" className="text-primary">
            Open your invite link
          </Link>{" "}
          after signing in.
        </p>
      </div>
    </main>
  );
}
