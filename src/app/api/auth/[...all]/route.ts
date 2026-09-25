import { NextResponse, type NextRequest } from "next/server";

import { getAuth } from "@/lib/auth";
import { isHostedMode } from "@/lib/hosting";
import { prisma } from "@/lib/prisma";

async function handle(request: NextRequest) {
  // Self-hosted first run (FR-HOST-01): once the single Workspace exists,
  // public sign-up is closed at the API level, not just in the UI — new
  // users arrive by invitation.
  if (
    !isHostedMode() &&
    request.method === "POST" &&
    request.nextUrl.pathname.endsWith("/sign-up/email")
  ) {
    const workspaceCount = await prisma.workspace.count();
    if (workspaceCount > 0) {
      // Invited teammates can still create an account: self-hosted closes
      // PUBLIC registration, not invite acceptance.
      const body = (await request
        .clone()
        .json()
        .catch(() => null)) as { email?: string } | null;
      const email = body?.email?.trim().toLowerCase();
      const invited = email
        ? await prisma.invite.findFirst({
            where: {
              email,
              acceptedAt: null,
              expiresAt: { gt: new Date() },
            },
            select: { id: true },
          })
        : null;
      if (!invited) {
        return NextResponse.json(
          { code: "user-creation-disabled", message: "Registration is closed on this installation." },
          { status: 422 },
        );
      }
    }
  }
  const auth = await getAuth();
  return auth.handler(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
