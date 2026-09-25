"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTheme } from "next-themes";
import {
  IconLogout,
  IconMenu2,
  IconMoon,
  IconSearch,
  IconSun,
} from "@tabler/icons-react";

import { useLayout } from "@/components/layout/layout-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

export type HeaderUser = { name: string; email: string };

export function AvailabilityControl({
  availability,
  isAdmin,
  onChange,
}: {
  availability: "LIVE" | "AWAY";
  isAdmin: boolean;
  onChange: (next: "LIVE" | "AWAY") => void;
}) {
  const state = availability === "LIVE";
  const label = state ? "Live" : "Away";

  if (!isAdmin) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-body"
        title="Only admins can change availability"
      >
        <span
          className={cnDot(state)}
          aria-hidden
        />
        {label}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-body hover:bg-hover"
          aria-label={`Support availability: ${label}`}
        >
          <span className={cnDot(state)} aria-hidden />
          {label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Support availability</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={availability === "LIVE"}
          onCheckedChange={() => onChange("LIVE")}
        >
          Live — visitors can chat in real time
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={availability === "AWAY"}
          onCheckedChange={() => onChange("AWAY")}
        >
          Away — visitors leave a message and an email address; you reply by email
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function cnDot(live: boolean) {
  return `inline-block size-2 rounded-full ${live ? "bg-success" : "bg-warning"}`;
}

export function Header({
  user,
  availability,
  isAdmin,
  onAvailabilityChange,
}: {
  user: HeaderUser;
  availability: "LIVE" | "AWAY";
  isAdmin: boolean;
  onAvailabilityChange: (next: "LIVE" | "AWAY") => void;
}) {
  const { collapsed, toggleCollapsed, setMobileOpen } = useLayout();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  void pending;

  async function signOut() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-header items-center gap-2 border-b border-border bg-surface px-4">
      <button
        type="button"
        className="rounded-md p-2 text-body hover:bg-hover lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <IconMenu2 className="size-5" />
      </button>
      <button
        type="button"
        className="hidden rounded-md p-2 text-body hover:bg-hover lg:inline-flex"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
      >
        <IconMenu2 className="size-5" />
      </button>

      <button
        type="button"
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left text-[0.9375rem] text-muted hover:bg-hover sm:max-w-sm"
        aria-label="Search (not wired yet)"
        disabled
      >
        <IconSearch className="size-[1.125rem]" />
        <span className="truncate">Search conversations…</span>
      </button>

      <div className="ms-auto flex items-center gap-1">
        <AvailabilityControl
          availability={availability}
          isAdmin={isAdmin}
          onChange={(next) =>
            startTransition(async () => {
              await onAvailabilityChange(next);
              router.refresh();
            })
          }
        />
        <Button
          variant="text"
          color="secondary"
          size="sm"
          iconOnly
          className="text-body"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <IconSun className="hidden size-5 dark:block" />
          <IconMoon className="size-5 dark:hidden" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-full focus-visible:outline-2 focus-visible:outline-primary"
              aria-label="Account menu"
            >
              <Avatar name={user.name} size={32} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="block truncate font-medium text-heading">{user.name}</span>
              <span className="block truncate text-xs font-normal text-muted">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void signOut()}>
              <IconLogout className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
