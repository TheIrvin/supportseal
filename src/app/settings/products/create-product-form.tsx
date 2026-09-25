"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProductAction, type ProductFormState } from "./actions";

const initialState: ProductFormState = {};

export function CreateProductForm() {
  const [state, formAction, pending] = useActionState(createProductAction, initialState);

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-medium text-heading">Add a Product</h2>
          <p className="mt-1 text-sm text-muted">
            Name it, give it a colour, and list the domains it runs on.
          </p>
        </div>
        <form action={formAction} className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Product name</Label>
            <Input id="name" name="name" placeholder="Alpha SaaS" required maxLength={60} />
          </div>
          <div>
            <Label htmlFor="primaryColor">Primary colour</Label>
            <div className="flex items-center gap-2">
              <Input
                id="primaryColor"
                name="primaryColor"
                type="color"
                defaultValue="#7367f0"
                className="h-[38px] w-16 p-1"
              />
              <span className="text-sm text-muted">Used in the widget and inbox</span>
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="domains">Domains</Label>
            <Input id="domains" name="domains" placeholder="app.example.com, docs.example.com" />
            <p className="mt-1 text-xs text-muted">
              Comma or space separated. The widget only loads on these domains.
            </p>
          </div>
          {state.error ? <p className="text-sm text-danger sm:col-span-2">{state.error}</p> : null}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create Product"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
