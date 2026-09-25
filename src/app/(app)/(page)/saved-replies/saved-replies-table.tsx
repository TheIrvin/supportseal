"use client";

import { useTransition } from "react";
import { IconTrash } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { deleteSavedReplyAction } from "./actions";

type Reply = { id: string; name: string; body: string; updatedAt: Date };

export function SavedRepliesTable({ replies, isAdmin }: { replies: Reply[]; isAdmin: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Body</th>
            {isAdmin ? <th className="px-4 py-3" /> : null}
          </tr>
        </thead>
        <tbody>
          {replies.map((reply) => (
            <tr key={reply.id} className="border-b border-border last:border-0 align-top">
              <td className="px-4 py-3 font-medium text-heading">{reply.name}</td>
              <td className="max-w-md px-4 py-3 text-body">
                <p className="line-clamp-2 whitespace-pre-wrap">{reply.body}</p>
              </td>
              {isAdmin ? (
                <td className="px-4 py-3 text-right">
                  <form
                    action={(formData) =>
                      startTransition(() => deleteSavedReplyAction(formData))
                    }
                  >
                    <input type="hidden" name="id" value={reply.id} />
                    <Button type="submit" variant="text" color="danger" size="xs" disabled={pending}>
                      <IconTrash className="size-3.5" />
                      Delete
                    </Button>
                  </form>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
