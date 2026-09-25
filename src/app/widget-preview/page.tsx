import type { Metadata } from "next";

import { loadWidgetProduct } from "@/lib/widget";

export const metadata: Metadata = {
  title: "Widget preview",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

/**
 * SupportSeal-hosted test page: embeds the real widget for a Product so
 * Admins can see and test the chat bubble before touching their own site
 * (onboarding.md "Open test page"). The service origin is inherently
 * trusted by the widget origin gate, so no allowlist entry is needed.
 *
 * Query: ?key=pk_…&availability=LIVE|AWAY&embed=1 (embed trims the chrome
 * for the Product settings iframe).
 */
export default async function WidgetPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string; availability?: string; embed?: string }>;
}) {
  const { key, availability, embed } = await searchParams;
  const product = key ? await loadWidgetProduct(key) : null;
  const away = availability === "AWAY";

  if (!product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-body-bg p-6">
        <p className="text-sm text-muted">
          Widget preview needs a valid Product key. Open it from Product settings.
        </p>
      </main>
    );
  }


  return (
    <main
      data-embed={embed === "1" ? "true" : undefined}
      className="min-h-screen bg-body-bg"
      style={{
        background:
          "linear-gradient(180deg, var(--vx-body-bg) 0%, var(--vx-surface-2) 100%)",
      }}
    >
      {embed !== "1" ? (
        <div className="border-b border-border bg-surface px-4 py-2 text-xs text-muted">
          Widget preview — {product.name} · this page behaves like a customer
          site on your allowed domains.
        </div>
      ) : null}
      <div className="mx-auto max-w-2xl px-6 py-14">
        <div
          className="rounded-lg border border-border bg-surface p-8 shadow-card"
          style={{ borderTop: `4px solid ${product.primaryColor}` }}
        >
          <p className="text-xs font-medium uppercase tracking-widest text-muted">
            Your product&apos;s site
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-heading">{product.name}</h1>
          <p className="mt-3 text-body">
            This stand-in page exists so you can try the chat bubble exactly as
            visitors will see it — before embedding the snippet on your real
            site. Try sending a message{away ? " while support is away" : ""}.
          </p>
          <div className="mt-6 space-y-2">
            <div className="h-3 w-4/5 rounded bg-surface-2" />
            <div className="h-3 w-3/5 rounded bg-surface-2" />
            <div className="h-3 w-2/3 rounded bg-surface-2" />
          </div>
        </div>
      </div>

      {/* The real widget, in preview mode (no network, canned reply). */}
      <script
        async
        src="/widget.js"
        data-key={product.widgetPublicKey}
        data-preview="1"
        data-name={product.name}
        data-color={product.primaryColor}
        data-availability={away ? "AWAY" : "LIVE"}
      />
    </main>
  );
}
