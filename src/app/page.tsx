import { redirect } from "next/navigation";

import { isHostedMode } from "@/lib/hosting";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const user = await getSessionUser();
  if (!user && !isHostedMode()) {
    const workspaceCount = await prisma.workspace.count();
    if (workspaceCount === 0) redirect("/register");
  }
  redirect("/inbox");
}
