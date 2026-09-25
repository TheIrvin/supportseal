"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorkspaceAction, type CreateWorkspaceState } from "./actions";

const initialState: CreateWorkspaceState = {};

export function CreateWorkspaceForm() {
  const [state, formAction, pending] = useActionState(createWorkspaceAction, initialState);

  return (
    <Card>
      <CardContent className="p-8 space-y-4">
        <div>
          <h1 className="text-[1.375rem] font-medium text-heading">Create your Workspace</h1>
          <p className="mt-1 text-muted">
            Your Workspace holds every product you build and the team that supports them.
          </p>
        </div>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="name">Workspace name</Label>
            <Input id="name" name="name" placeholder="Acme Studio" required minLength={2} maxLength={80} />
          </div>
          {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
          <Button className="w-full" type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create Workspace"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
