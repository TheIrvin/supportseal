"use client";

import { useEffect, useState } from "react";
import {
  IconBell,
  IconLanguage,
  IconLayoutGrid,
  IconLogout,
  IconMail,
  IconMenu2,
  IconMoon,
  IconSearch,
  IconSettings,
  IconSun,
  IconUser,
} from "@tabler/icons-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useLayout } from "@/components/layout/layout-provider";
import { SearchCommand } from "@/components/layout/search-command";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { collapsed, toggleCollapsed, setMobileOpen } = useLayout();
  const { resolvedTheme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-4 z-30 mx-4 mb-4 flex h-[3.875rem] items-center gap-2 rounded-lg bg-surface px-4 shadow-card lg:mx-6">
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
      >
        <IconMenu2 className="size-5" />
      </button>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left text-[0.9375rem] text-muted hover:bg-hover sm:max-w-sm"
      >
        <IconSearch className="size-[1.125rem]" />
        <span className="truncate">Search [CTRL + K]</span>
      </button>

      <div className="ms-auto flex items-center gap-1">
        <Button variant="text" color="secondary" size="sm" iconOnly className="text-body" aria-label="Language">
          <IconLanguage className="size-5" />
        </Button>
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
            <Button variant="text" color="secondary" size="sm" iconOnly className="text-body" aria-label="Shortcuts">
              <IconLayoutGrid className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Shortcuts</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href="/">Analytics</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/apps/users">Users</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/ui/cards">Cards</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/charts/apex">Apex Charts</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="text" color="secondary" size="sm" iconOnly className="relative text-body" aria-label="Notifications">
              <IconBell className="size-5" />
              <span className="absolute top-1 right-1 size-2 rounded-full bg-danger" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between normal-case tracking-normal">
              <span>Notifications</span>
              <Badge color="primary">4 New</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {[
              { title: "Congratulation Flora! 🎉", body: "Won the monthly best seller badge" },
              { title: "New user registered.", body: "5 hours ago" },
              { title: "New message received 👋🏻", body: "You have 10 unread messages" },
              { title: "Paypal", body: "Received Payment" },
            ].map((item) => (
              <DropdownMenuItem key={item.title} className="flex-col items-start">
                <span className="font-medium">{item.title}</span>
                <span className="text-[0.8125rem] text-muted">{item.body}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="ms-1 rounded-full" aria-label="Account">
              <Avatar name="John Doe" status="online" size={38} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-3 px-3 py-2">
              <Avatar name="John Doe" size={38} />
              <div>
                <p className="font-medium text-heading">John Doe</p>
                <p className="text-[0.75rem] text-muted">Admin</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/apps/users/1">
                <IconUser className="size-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <IconSettings className="size-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <IconMail className="size-4" /> Inbox
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/login">
                <IconLogout className="size-4" /> Logout
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
