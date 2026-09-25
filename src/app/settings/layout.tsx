import { SettingsNav } from "./settings-nav";
import { requireWorkspace } from "@/lib/workspace";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireWorkspace("/settings");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-heading">Settings</h1>
      <SettingsNav />
      {children}
    </div>
  );
}
