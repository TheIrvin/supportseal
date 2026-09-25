import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProductForWorkspace } from "@/lib/products";
import { appConfig } from "@/lib/config";
import { requireWorkspace } from "@/lib/workspace";
import { ArchiveForm } from "./archive-form";
import { DomainsCard } from "./domains-card";
import { EditProductForm } from "./edit-product-form";
import { WidgetSnippet } from "./widget-snippet";

export const metadata = { title: "Product settings" };

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireWorkspace(`/settings/products/${id}`);
  const product = await getProductForWorkspace(ctx.workspace.id, id);
  if (!product) notFound();

  const embedSnippet = `<script\n  async\n  src="${appConfig.url}/widget.js"\n  data-key="${product.widgetPublicKey}"\n></script>`;

  return (
    <div className="space-y-8">
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

      {ctx.role === "ADMIN" ? (
        <>
          <EditProductForm
            product={{ id: product.id, name: product.name, primaryColor: product.primaryColor }}
          />
          <DomainsCard
            productId={product.id}
            domains={product.domains.map((d) => ({ id: d.id, domain: d.domain }))}
          />
          <ArchiveForm productId={product.id} archived={product.archivedAt !== null} />
        </>
      ) : (
        <p className="text-sm text-muted">Only Workspace admins can edit Product settings.</p>
      )}

      <WidgetSnippet snippet={embedSnippet} widgetKey={product.widgetPublicKey} />
    </div>
  );
}
