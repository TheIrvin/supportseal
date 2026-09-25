import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getInviteByToken } from "@/lib/workspace";
import { getSessionUser } from "@/lib/session";
import { AcceptInviteForm } from "./accept-invite-form";

export const metadata = { title: "Workspace invite" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInviteByToken(token);
  const user = await getSessionUser();

  if (!invite || invite.status !== "pending") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-body-bg p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <h1 className="text-[1.375rem] font-medium text-heading">Invite not available</h1>
            <p className="text-muted">
              This invite link is invalid, expired, or already used. Ask a Workspace admin for a
              fresh invite.
            </p>
            <Button asChild variant="outline">
              <Link href="/login">Go to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const emailMatches = user !== null && user.email.toLowerCase() === invite.email;

  return (
    <main className="flex min-h-screen items-center justify-center bg-body-bg p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 space-y-4">
          <div className="space-y-1">
            <Badge>{invite.workspace.name}</Badge>
            <h1 className="text-[1.375rem] font-medium text-heading">
              Join {invite.workspace.name}
            </h1>
            <p className="text-muted">
              You have been invited as <strong>{invite.role === "ADMIN" ? "an Admin" : "an Agent"}</strong>{" "}
              for <strong>{invite.email}</strong>.
            </p>
          </div>
          {user === null ? (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Sign in (or create an account) with {invite.email} to accept this invite, then
                return to this link.
              </p>
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>Sign in</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/register">Create account</Link>
                </Button>
              </div>
            </div>
          ) : emailMatches ? (
            <AcceptInviteForm token={token} />
          ) : (
            <p className="text-sm text-danger">
              You are signed in as {user.email}, but this invite was sent to {invite.email}. Sign
              in with that address to accept it.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
