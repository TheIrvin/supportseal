"use client";

import { LayoutProvider, useLayout } from "@/components/layout/layout-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

function Shell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useLayout();

  return (
    <div className="min-h-screen bg-body-bg">
      <Sidebar />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[margin] duration-200",
          collapsed ? "lg:ms-sidebar-collapsed" : "lg:ms-sidebar",
        )}
      >
        <Header />
        <main className="flex-1 px-4 pb-6 lg:px-6">{children}</main>
        <Footer />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LayoutProvider>
      <TooltipProvider>
        <Shell>{children}</Shell>
      </TooltipProvider>
    </LayoutProvider>
  );
}
