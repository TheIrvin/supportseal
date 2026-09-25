import { listInvites, listMembers, requireWorkspace } from "@/lib/workspace";
import { InviteForm } from "./invite-form";
import { InvitesTable } from "./invites-table";
import { MembersTable } from "./members-table";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const ctx = await requireWorkspace("/settings/team");
  const [members, invites] = await Promise.all([
    listMembers(ctx.workspace.id),
    listInvites(ctx.workspace.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-heading">Team</h1>
        <p className="mt-1 text-muted">
          Admins manage the Workspace, Products and settings. Agents work the inbox.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-heading">Members</h2>
        <MembersTable members={members} currentUserId={ctx.user.id} />
      </section>

      {ctx.role === "ADMIN" ? (
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-heading">Invite a teammate</h2>
          <InviteForm />
          {invites.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted">Pending & past invites</h3>
              <InvitesTable invites={invites} />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
