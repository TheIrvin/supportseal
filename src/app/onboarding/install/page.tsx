import { redirect } from "next/navigation";

import { requireWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { appConfig } from "@/lib/config";
import { issueWidgetTestToken } from "@/lib/onboarding";
import { WizardShell } from "../wizard-shell";
import { WaitingCard } from "./waiting-card";

export const metadata = { title: "Get started · Install" };

export default async function InstallStepPage() {
  const ctx = await requireWorkspace("/onboarding/install");
  const product = await prisma.product.findFirst({
    where: { workspaceId: ctx.workspace.id },
    include: { domains: true },
    orderBy: { createdAt: "asc" },
  });
  if (!product) redirect("/onboarding/product");

  const snippet = `<script\n  async\n  src="${appConfig.url}/widget.js"\n  data-key="${product.widgetPublicKey}"\n></script>`;
  const { token } = issueWidgetTestToken(product.id);
  const tokenEnabled = token !== "";
  const testUrl = tokenEnabled
    ? `/widget-preview?key=${encodeURIComponent(product.widgetPublicKey)}&testToken=${encodeURIComponent(token)}`
    : null;

  return (
    <WizardShell step={4} heading="Install and test">
      <div className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-heading">Paste this before &lt;/body&gt;</h3>
          <pre className="overflow-x-auto rounded-lg border border-border bg-surface-2 p-3 font-mono text-xs leading-relaxed">
            {snippet}
          </pre>
          <p className="text-xs text-muted">
            This key is public — it only works on the domains you allowed. The script survives
            client-side navigation, so one include in your root layout is enough.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium text-heading">Test it</h3>
          {testUrl ? (
            <div className="flex flex-wrap gap-3">
              <a
                href={testUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center rounded-md border border-border-strong px-4 text-sm font-medium text-heading hover:bg-hover"
              >
                Open test page (new tab)
              </a>
              <span className="self-center text-xs text-muted">or embed the snippet and chat from your site.</span>
            </div>
          ) : (
            <p className="text-sm text-muted">
              Embed the snippet on your site (or a local HTML page) and send a chat — the test
              page needs a configured <code>BETTER_AUTH_SECRET</code> to sign test tokens.
            </p>
          )}
        </section>

        <WaitingCard productId={product.id} />
      </div>
    </WizardShell>
  );
}
