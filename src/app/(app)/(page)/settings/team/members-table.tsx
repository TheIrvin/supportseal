import { Badge } from "@/components/ui/badge";

type Member = {
  id: string;
  role: "ADMIN" | "AGENT";
  user: { id: string; name: string; email: string };
};

export function MembersTable({ members, currentUserId }: { members: Member[]; currentUserId: string }) {
  return (
    <div className="rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Role</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-medium text-heading">
                {member.user.name}
                {member.user.id === currentUserId ? (
                  <span className="ml-2 text-xs text-muted">(you)</span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-body">{member.user.email}</td>
              <td className="px-4 py-3">
                <Badge variant="light" color={member.role === "ADMIN" ? "primary" : "secondary"}>
                  {member.role === "ADMIN" ? "Admin" : "Agent"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
