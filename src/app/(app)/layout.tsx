import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { listProducts } from "@/lib/products";
import { getAvailability, requireWorkspace } from "@/lib/workspace";
import { setAvailabilityAction } from "./actions";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await requireWorkspace();

  const [products, counts, availability] = await Promise.all([
    listProducts(ctx.workspace.id),
    prisma.conversation.groupBy({
      by: ["productId"],
      where: { workspaceId: ctx.workspace.id, status: "OPEN" },
      _count: { _all: true },
    }),
    getAvailability(ctx.workspace.id),
  ]);

  const countByProduct = new Map(counts.map((c) => [c.productId, c._count._all]));

  return (
    <AppShell
      user={{ name: ctx.user.name, email: ctx.user.email }}
      role={ctx.role}
      availability={availability}
      onAvailabilityChange={setAvailabilityAction}
      products={products
        .filter((p) => p.archivedAt === null)
        .map((p) => ({
          id: p.id,
          name: p.name,
          primaryColor: p.primaryColor,
          openCount: countByProduct.get(p.id) ?? 0,
        }))}
    >
      {children}
    </AppShell>
  );
}
