"use client";

import { useState } from "react";
import { IconExternalLink } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { appConfig } from "@/lib/config";
import { WidgetSnippet } from "./widget-snippet";

type PreviewProduct = {
  id: string;
  name: string;
  primaryColor: string;
  widgetPublicKey: string;
  archived: boolean;
};

/**
 * Widget tab (docs/design/product-settings.md): embed snippet plus the real
 * widget in preview mode with a Live/Away toggle. The toggle only changes
 * the preview — real availability is the Workspace-wide header control.
 */
export function WidgetTab({ product }: { product: PreviewProduct }) {
  const [availability, setAvailability] = useState<"LIVE" | "AWAY">("LIVE");

  const embedSnippet = `<script\n  async\n  src="${appConfig.url}/widget.js"\n  data-key="${product.widgetPublicKey}"\n></script>`;
  const previewUrl = `/widget-preview?key=${encodeURIComponent(product.widgetPublicKey)}&availability=${availability}&embed=1`;

  return (
    <div className="space-y-6">
      {product.archived ? (
        <p className="rounded-md bg-secondary-label px-3 py-2 text-sm text-body">
          This Product is archived: the widget no longer loads on customer sites.
        </p>
      ) : null}

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-medium text-heading">Preview</h3>
              <p className="mt-1 text-sm text-muted">
                The real chat bubble, exactly as visitors will see it. Messages
                here stay in preview mode — nothing reaches the inbox.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border border-border" role="group" aria-label="Preview availability">
                {(["LIVE", "AWAY"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={availability === mode}
                    onClick={() => setAvailability(mode)}
                    className={
                      availability === mode
                        ? "rounded-md bg-primary-label px-3 py-1.5 text-sm font-medium text-primary"
                        : "px-3 py-1.5 text-sm text-body hover:text-heading"
                    }
                  >
                    {mode === "LIVE" ? "Live" : "Away"}
                  </button>
                ))}
              </div>
              <Button asChild variant="outline" size="sm">
                <a href={`/widget-preview?key=${encodeURIComponent(product.widgetPublicKey)}&availability=${availability}`} target="_blank" rel="noopener">
                  <IconExternalLink className="size-4" />
                  Open test page
                </a>
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <iframe
              key={availability}
              src={previewUrl}
              title={`${product.name} widget preview`}
              className="h-[480px] w-full border-0 bg-body-bg"
            />
          </div>
        </CardContent>
      </Card>

      <WidgetSnippet snippet={embedSnippet} widgetKey={product.widgetPublicKey} />

      <Card>
        <CardContent className="p-6 space-y-3">
          <h3 className="text-lg font-medium text-heading">Developer context</h3>
          <p className="text-sm text-muted">
            Call <code className="rounded bg-surface-2 px-1 font-mono text-xs">SupportSealWidget.identify()</code>{" "}
            and{" "}
            <code className="rounded bg-surface-2 px-1 font-mono text-xs">SupportSealWidget.context()</code>{" "}
            from your app to attach account details and custom metadata to the conversation.
          </p>
          <pre className="overflow-x-auto rounded-md border border-border bg-surface-2 p-3 text-xs leading-relaxed">
{`<script>
  window.SupportSealWidget = window.SupportSealWidget || { q: [] };
  // Async-safety queue — works before the widget loads:
  window.SupportSealWidget.q.push(["identify", {
    id: user.id, email: user.email, name: user.name
  }]);
  window.SupportSealWidget.q.push(["context", {
    plan: account.plan,
    appVersion: APP_VERSION,
    adminUrl: \`https://admin.yourapp.com/users/\${user.id}\`
  }]);
</script>`}
          </pre>
          <p className="text-xs text-muted">
            Context is validated, size- and depth-bounded, and rendered as untrusted text in the
            inbox. The widget never reads cookies, storage or form values.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
