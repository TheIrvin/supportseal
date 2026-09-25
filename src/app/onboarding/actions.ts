"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createProduct } from "@/lib/products";
import { addProductDomain, normalizeDomain } from "@/lib/products";
import { requireWorkspace } from "@/lib/workspace";
import { createWorkspace as createWorkspaceService } from "@/lib/workspace";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function createWorkspaceAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fonboarding");
  const name = String(formData.get("name") ?? "");
  const result = await createWorkspaceService({ userId: user.id, name });
  if (!result.ok) redirect("/onboarding?error=1");
  revalidatePath("/", "layout");
  redirect("/onboarding/product");
}

export async function createProductAction(formData: FormData): Promise<void> {
  const ctx = await requireWorkspace("/onboarding");
  const name = String(formData.get("name") ?? "");
  const color = String(formData.get("primaryColor") ?? "#2563eb");
  const result = await createProduct({ ctx, name, primaryColor: color });
  if (!result.ok) redirect(`/onboarding/product?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/", "layout");
  redirect("/onboarding/domain");
}

export async function saveDomainsAction(formData: FormData): Promise<void> {
  const ctx = await requireWorkspace("/onboarding");
  const product = await prisma.product.findFirst({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { createdAt: "asc" },
  });
  if (!product) redirect("/onboarding/product");

  const raw = String(formData.get("domains") ?? "");
  const allowLocalhost = String(formData.get("allowLocalhost") ?? "") === "on";
  const entries = raw
    .split(/[\n,]+/u)
    .map((entry) => entry.trim())
    .filter(Boolean);

  let added = 0;
  for (const entry of entries) {
    const domain = normalizeDomain(entry);
    if (!domain) continue;
    const result = await addProductDomain({ ctx, productId: product.id, domain });
    if (result.ok) added += 1;
  }
  if (allowLocalhost) {
    const result = await addProductDomain({ ctx, productId: product.id, domain: "localhost" });
    if (result.ok) added += 1;
  }
  revalidatePath("/", "layout");
  if (added === 0 && entries.length > 0) {
    redirect(`/onboarding/domain?error=invalid`);
  }
  redirect("/onboarding/install");
}

export async function skipDomainsAction(): Promise<void> {
  redirect("/onboarding/install");
}
