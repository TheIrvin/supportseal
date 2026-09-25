import { redirect } from "next/navigation";

import { isHostedMode } from "@/lib/hosting";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Self-hosted root entry: `proxy.ts` rewrites `/` here when HOSTED_MODE is
 * unset, preserving the pre-marketing behaviour (first-run → /register,
 * otherwise → /inbox). In hosted mode the marketing home is served at `/`
 * and a direct visit to /start is bounced back there.
 */
export default async function StartPage() {
  if (isHostedMode()) redirect("/");
  const user = await getSessionUser();
  if (!user) {
    const workspaceCount = await prisma.workspace.count();
    if (workspaceCount === 0) redirect("/register");
  }
  redirect("/inbox");
}
