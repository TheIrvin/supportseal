"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { IconCircle, IconCircleDot, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/cn";
import { menuSections, type MenuItem } from "@/config/menu";
import { useLayout } from "@/components/layout/layout-provider";
import { Logo } from "@/components/layout/logo";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function isActive(pathname: string, href?: string) {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function itemOrChildActive(pathname: string, item: MenuItem): boolean {
  if (isActive(pathname, item.href)) return true;
  return item.children?.some((child) => itemOrChildActive(pathname, child)) ?? false;
}

function NavLink({
  item,
  nested,
  collapsed,
  onNavigate,
}: {
  item: MenuItem;
  nested?: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = item.icon ?? IconCircle;

  const content = (
    <Link
      href={item.href ?? "#"}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-3 py-2 text-[0.9375rem] transition-colors",
        nested && "ps-10",
        active
          ? "bg-primary text-white shadow-[0_2px_6px_rgba(115,103,240,0.35)]"
          : "text-body hover:bg-hover hover:text-heading",
        collapsed && !nested && "lg:justify-center lg:px-0",
      )}
    >
      {nested ? (
        <IconCircle
          className={cn("size-2.5", active ? "fill-white text-white" : "text-muted")}
        />
      ) : (
        <Icon className="size-[22px] shrink-0" stroke={1.6} />
      )}
      <span className={cn("truncate", collapsed && "lg:hidden")}>{item.label}</span>
      {item.badge && !(collapsed && !nested) ? (
        <Badge color="danger" variant="solid" className={cn("ms-auto h-5 min-w-5 px-1.5", collapsed && "lg:hidden")}>
          {item.badge}
        </Badge>
      ) : null}
    </Link>
  );

  if (collapsed && !nested) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

function NavGroup({
  item,
  collapsed,
  onNavigate,
}: {
  item: MenuItem;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const childActive = itemOrChildActive(pathname, item);
  const [toggled, setToggled] = useState<boolean | null>(null);
  const open = toggled ?? childActive;
  const Icon = item.icon ?? IconCircleDot;

  if (!item.children?.length) {
    return <NavLink item={item} collapsed={collapsed} onNavigate={onNavigate} />;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setToggled(!open)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[0.9375rem] text-body transition-colors hover:bg-hover hover:text-heading",
          childActive && !open && "text-primary",
          collapsed && "lg:justify-center lg:px-0",
        )}
      >
        <Icon className="size-[22px] shrink-0" stroke={1.6} />
        <span className={cn("truncate", collapsed && "lg:hidden")}>{item.label}</span>
        {item.badge ? (
          <Badge color="danger" variant="solid" className={cn("ms-auto h-5 min-w-5 px-1.5", collapsed && "lg:hidden")}>
            {item.badge}
          </Badge>
        ) : null}
        <span
          className={cn(
            "ms-auto text-muted transition-transform",
            open && "rotate-90",
            collapsed && "lg:hidden",
            item.badge && "ms-1",
          )}
        >
          ▸
        </span>
      </button>
      <div className={cn("grid transition-[grid-template-rows] duration-200", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]", collapsed && "lg:hidden")}>
        <div className="overflow-hidden">
          <div className="mt-0.5 space-y-0.5">
            {item.children.map((child) => (
              <NavLink
                key={child.id}
                item={child}
                nested
                collapsed={false}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useLayout();

  const sections = useMemo(() => menuSections, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 lg:hidden",
          mobileOpen ? "block" : "hidden",
        )}
        onClick={() => setMobileOpen(false)}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-surface shadow-card transition-[width,transform] duration-200",
          "w-sidebar",
          collapsed && "lg:w-sidebar-collapsed",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-header items-center justify-between px-5">
          <Logo collapsed={collapsed} />
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden size-6 items-center justify-center rounded-full border-2 border-primary text-primary lg:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="size-1.5 rounded-full bg-primary" />
          </button>
          <button
            type="button"
            className="rounded-md p-1 text-muted hover:bg-hover lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <IconX className="size-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
          {sections.map((section) => (
            <div key={section.id}>
              {section.label ? (
                <p
                  className={cn(
                    "mb-2 px-3 text-[0.6875rem] font-medium tracking-[0.08em] text-muted uppercase",
                    collapsed && "lg:hidden",
                  )}
                >
                  {section.label}
                </p>
              ) : null}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavGroup
                    key={item.id}
                    item={item}
                    collapsed={collapsed}
                    onNavigate={() => setMobileOpen(false)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
