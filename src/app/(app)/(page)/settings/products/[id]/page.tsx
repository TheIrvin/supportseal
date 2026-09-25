import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProductForWorkspace } from "@/lib/products";
import { requireWorkspace } from "@/lib/workspace";
import { ArchiveForm } from "./archive-form";
import { DomainsCard } from "./domains-card";
import { EditProductForm } from "./edit-product-form";
import { WidgetTab } from "./widget-tab";

export const metadata = { title: "Product settings" };

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const ctx = await requireWorkspace(`/settings/products/${id}`);
  const product = await getProductForWorkspace(ctx.workspace.id, id);
  if (!product) notFound();

  const activeTab = tab === "widget" ? "widget" : "general";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <span
          className="inline-block size-4 rounded-full"
          style={{ backgroundColor: product.primaryColor }}
          aria-hidden
        />
        <h2 className="text-xl font-semibold text-heading">{product.name}</h2>
        {product.archivedAt ? (
          <Badge variant="light" color="secondary">
            Archived
          </Badge>
        ) : null}
        <Button asChild variant="text" color="secondary" size="sm" className="ml-auto">
          <Link href="/settings/products">All Products</Link>
        </Button>
      </header>

      <nav className="flex gap-1 border-b border-border" aria-label="Product settings">
        {[
          { id: "general", label: "General", href: `/settings/products/${product.id}` },
          {
            id: "widget",
            label: "Widget",
            href: `/settings/products/${product.id}?tab=widget`,
          },
        ].map((item) => (
          <Link
            key={item.id}
            href={item.href}
            aria-current={activeTab === item.id ? "page" : undefined}
            className={
              activeTab === item.id
                ? "-mb-px border-b-2 border-primary px-4 py-2.5 text-sm font-medium text-heading"
                : "-mb-px border-b-2 border-transparent px-4 py-2.5 text-sm text-body hover:text-heading"
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {activeTab === "general" ? (
        ctx.role === "ADMIN" ? (
          <div className="space-y-6">
            <EditProductForm
              product={{ id: product.id, name: product.name, primaryColor: product.primaryColor }}
            />
            <DomainsCard
              productId={product.id}
              domains={product.domains.map((d) => ({ id: d.id, domain: d.domain }))}
            />
            <ArchiveForm productId={product.id} archived={product.archivedAt !== null} />
          </div>
        ) : (
          <p className="text-sm text-muted">Only Workspace admins can edit Product settings.</p>
        )
      ) : (
        <WidgetTab
          product={{
            id: product.id,
            name: product.name,
            primaryColor: product.primaryColor,
            widgetPublicKey: product.widgetPublicKey,
            archived: product.archivedAt !== null,
          }}
        />
      )}
    </div>
  );
}
