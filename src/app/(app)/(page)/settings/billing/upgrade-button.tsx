"use client";

import { useState } from "react";

export function UpgradeButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upgrade() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/billing/checkout", { method: "POST" });
    const data = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (data?.url) {
      window.location.assign(data.url);
      return;
    }
    setPending(false);
    setError(
      data?.error === "billing_not_configured"
        ? "Billing is not configured on this installation yet."
        : "Could not start checkout. Try again shortly.",
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void upgrade()}
        disabled={pending}
        className="h-10 rounded-md bg-primary px-5 text-sm font-medium text-primary-contrast hover:bg-primary-dark disabled:opacity-60"
      >
        {pending ? "Starting checkout…" : "Upgrade to Pro"}
      </button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <p className="text-xs text-muted">
        Unlimited products, agents and conversations. Manage or cancel any time.
      </p>
    </div>
  );
}
