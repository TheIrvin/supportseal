import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { revokeInviteAction } from "./actions";

type Invite = {
  id: string;
  email: string;
  role: "ADMIN" | "AGENT";
  status: "pending" | "accepted" | "expired";
  createdAt: Date;
};

const statusVariant: Record<Invite["status"], { color: "primary" | "success" | "secondary" }> = {
  pending: { color: "primary" },
  accepted: { color: "success" },
  expired: { color: "secondary" },
};

export function InvitesTable({ invites }: { invites: Invite[] }) {
  return (
    <div className="rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {invites.map((invite) => (
            <tr key={invite.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 text-body">{invite.email}</td>
              <td className="px-4 py-3 text-body">{invite.role === "ADMIN" ? "Admin" : "Agent"}</td>
              <td className="px-4 py-3">
                <Badge variant="light" color={statusVariant[invite.status].color}>
                  {invite.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                {invite.status === "pending" ? (
                  <form action={revokeInviteAction}>
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <Button type="submit" variant="text" color="danger" size="sm">
                      Revoke
                    </Button>
                  </form>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
