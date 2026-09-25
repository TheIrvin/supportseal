"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addProductDomain,
  archiveProduct,
  createProduct,
  removeProductDomain,
  updateProduct,
} from "@/lib/products";
import { requireWorkspace } from "@/lib/workspace";

export type ProductFormState = { error?: string };

function parseDomains(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(/[\s,]+/u)
    .map((d) => d.trim())
    .filter(Boolean);
}

export async function createProductAction(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const ctx = await requireWorkspace("/settings/products");
  const result = await createProduct({
    ctx,
    name: String(formData.get("name") ?? ""),
    primaryColor: String(formData.get("primaryColor") ?? "#7367f0"),
    domains: parseDomains(formData.get("domains")),
  });
  if (!result.ok) return { error: result.error };
  revalidatePath("/settings/products");
  redirect(`/settings/products/${result.product.id}`);
}

export async function updateProductAction(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const ctx = await requireWorkspace("/settings/products");
  const productId = String(formData.get("productId") ?? "");
  const result = await updateProduct({
    ctx,
    productId,
    name: String(formData.get("name") ?? ""),
    primaryColor: String(formData.get("primaryColor") ?? "#7367f0"),
  });
  if (!result.ok) return { error: result.error };
  revalidatePath(`/settings/products/${productId}`);
  revalidatePath("/settings/products");
  return {};
}

export async function addDomainAction(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const ctx = await requireWorkspace("/settings/products");
  const productId = String(formData.get("productId") ?? "");
  const result = await addProductDomain({
    ctx,
    productId,
    domain: String(formData.get("domain") ?? ""),
  });
  if (!result.ok) return { error: result.error };
  revalidatePath(`/settings/products/${productId}`);
  return {};
}

export async function removeDomainAction(formData: FormData): Promise<void> {
  const ctx = await requireWorkspace("/settings/products");
  const productId = String(formData.get("productId") ?? "");
  await removeProductDomain({
    ctx,
    productId,
    domainId: String(formData.get("domainId") ?? ""),
  });
  revalidatePath(`/settings/products/${productId}`);
}

export async function archiveAction(formData: FormData): Promise<void> {
  const ctx = await requireWorkspace("/settings/products");
  const productId = String(formData.get("productId") ?? "");
  const archived = String(formData.get("archived") ?? "") === "true";
  await archiveProduct({ ctx, productId, archived });
  revalidatePath("/settings/products");
  revalidatePath(`/settings/products/${productId}`);
}
