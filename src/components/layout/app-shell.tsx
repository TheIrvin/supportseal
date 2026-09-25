"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";
import { Header } from "@/components/layout/header";
import { LayoutProvider, useLayout } from "@/components/layout/layout-provider";
import { Sidebar, type SidebarProduct } from "@/components/layout/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export type ShellUser = { name: string; email: string };

function Shell({
  user,
  role,
  products,
  availability,
  onAvailabilityChange,
  mode = "page",
  children,
}: {
  user: ShellUser;
  role: "ADMIN" | "AGENT";
  products: SidebarProduct[];
  availability: "LIVE" | "AWAY";
  onAvailabilityChange: (next: "LIVE" | "AWAY") => void;
  mode?: "page" | "fill";
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { collapsed } = useLayout();

  return (
    <div className="min-h-screen bg-body-bg">
      <Sidebar
        products={products}
        role={role}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[margin] duration-200",
          collapsed ? "lg:ms-sidebar-collapsed" : "lg:ms-sidebar",
        )}
      >
        <Header
          user={user}
          availability={availability}
          isAdmin={role === "ADMIN"}
          onAvailabilityChange={onAvailabilityChange}
        />
        <main
          id="main"
          className={cn(
            mode === "fill"
              ? "h-[calc(100dvh-var(--vx-header-height))] overflow-hidden"
              : "flex-1 px-4 py-6 lg:px-6",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell(props: Parameters<typeof Shell>[0]) {
  return (
    <LayoutProvider>
      <TooltipProvider delayDuration={200}>
        <Shell {...props} />
      </TooltipProvider>
    </LayoutProvider>
  );
}
