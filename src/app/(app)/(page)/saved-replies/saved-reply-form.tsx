"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSavedReplyAction, type SavedReplyFormState } from "./actions";

const initialState: SavedReplyFormState = {};

export function SavedReplyForm() {
  const [state, formAction, pending] = useActionState(createSavedReplyAction, initialState);

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h2 className="text-lg font-medium text-heading">Add a saved reply</h2>
        <form action={formAction} className="space-y-3">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Refund policy" required maxLength={80} />
          </div>
          <div>
            <Label htmlFor="body">Body</Label>
            <textarea
              id="body"
              name="body"
              rows={4}
              required
              maxLength={4000}
              className="w-full resize-none rounded-md border border-border-strong bg-surface p-2.5 text-sm text-heading placeholder:text-muted focus-visible:outline-2 focus-visible:outline-primary"
            />
          </div>
          {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save reply"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
