import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProductForWorkspace, getDiagnosticsEnabler } from "@/lib/products";
import { countFailedReplies, lastInboundReceived } from "@/lib/email/delivery";
import { managedSender } from "@/lib/email/outbound";
import { countSnapshotsForProduct } from "@/lib/diagnostics/store";
import { isHostedMode } from "@/lib/hosting";
import { requireWorkspace } from "@/lib/workspace";
import { ArchiveForm } from "./archive-form";
import { DeveloperTab } from "./developer-tab";
import { DomainsCard } from "./domains-card";
import { EditProductForm } from "./edit-product-form";
import { EmailTab } from "./email-tab";
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

  const activeTab =
    tab === "widget"
      ? "widget"
      : tab === "email"
        ? "email"
        : tab === "developer"
          ? "developer"
          : "general";
  const [diagnosticsEnabler, snapshotCount, lastReceived, failedReplies] = await Promise.all([
    getDiagnosticsEnabler({ workspaceId: ctx.workspace.id, productId: product.id }),
    countSnapshotsForProduct(ctx.workspace.id, product.id),
    lastInboundReceived(ctx.workspace.id, product.id),
    countFailedReplies(ctx.workspace.id, product.id),
  ]);

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
          {
            id: "email",
            label: "Email",
            href: `/settings/products/${product.id}?tab=email`,
          },
          {
            id: "developer",
            label: "Developer",
            href: `/settings/products/${product.id}?tab=developer`,
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
      ) : activeTab === "email" ? (
        <EmailTab
          product={{
            id: product.id,
            name: product.name,
            inboundEmail: product.inboundEmail,
            archived: product.archivedAt !== null,
            isAdmin: ctx.role === "ADMIN",
          }}
          managedSender={managedSender()}
          lastReceived={lastReceived}
          failedReplies={failedReplies}
        />
      ) : activeTab === "widget" ? (
        <WidgetTab
          product={{
            id: product.id,
            name: product.name,
            primaryColor: product.primaryColor,
            widgetPublicKey: product.widgetPublicKey,
            archived: product.archivedAt !== null,
          }}
        />
      ) : (
        <DeveloperTab
          product={{
            id: product.id,
            name: product.name,
            widgetPublicKey: product.widgetPublicKey,
            archived: product.archivedAt !== null,
            isAdmin: ctx.role === "ADMIN",
            diagnosticsEnabled: product.diagnosticsEnabledAt !== null,
            diagnosticsEnabledBy: diagnosticsEnabler,
            snapshotCount,
            hosted: isHostedMode(),
          }}
        />
      )}
    </div>
  );
}
