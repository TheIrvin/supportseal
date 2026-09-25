"use client";

import { useActionState } from "react";
import { IconTrash } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addDomainAction, removeDomainAction, type ProductFormState } from "../actions";

const initialState: ProductFormState = {};

export function DomainsCard({
  productId,
  domains,
}: {
  productId: string;
  domains: { id: string; domain: string }[];
}) {
  const [state, formAction, pending] = useActionState(addDomainAction, initialState);

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-medium text-heading">Domains</h2>
          <p className="mt-1 text-sm text-muted">
            The widget only loads on these domains (localhost always works in development).
          </p>
        </div>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {domains.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">No domains yet.</li>
          ) : (
            domains.map((domain) => (
              <li key={domain.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="font-mono text-sm text-body">{domain.domain}</span>
                <form action={removeDomainAction}>
                  <input type="hidden" name="productId" value={productId} />
                  <input type="hidden" name="domainId" value={domain.id} />
                  <Button type="submit" variant="text" color="danger" size="xs">
                    <IconTrash className="size-3.5" />
                    Remove
                  </Button>
                </form>
              </li>
            ))
          )}
        </ul>
        <form action={formAction} className="flex items-end gap-3">
          <input type="hidden" name="productId" value={productId} />
          <div className="flex-1">
            <Label htmlFor="domain">Add domain</Label>
            <Input id="domain" name="domain" placeholder="app.example.com" required />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add"}
          </Button>
        </form>
        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      </CardContent>
    </Card>
  );
}
