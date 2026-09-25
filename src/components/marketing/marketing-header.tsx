"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { IconArrowUpRight, IconMenu2 } from "@tabler/icons-react";

import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";

type NavLink = { label: string; href: string };

const INTERNAL_LINKS: NavLink[] = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Open source", href: "/open-source" },
];

const EXTERNAL_LINKS: Array<NavLink & { note: string }> = [
  { label: "Docs", href: siteConfig.selfHostingGuideUrl, note: "opens on GitHub" },
  { label: "GitHub", href: siteConfig.repositoryUrl, note: "opens on GitHub" },
];

const HEADER_CTA: NavLink = { label: "Set up your inbox", href: "/register" };

/**
 * Public marketing header (docs/design/marketing-site.md, "Global frame"):
 * solid background, current page marked with a primary underline, theme
 * toggle shared with the app, and the existing Sheet for the mobile menu.
 */
export function MarketingHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-header items-center border-b border-border bg-body-bg">
      <div className="mx-auto flex w-full max-w-[80rem] items-center gap-6 px-5 sm:px-8">
        <Logo href="/" className="lg:me-4" />

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {INTERNAL_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center rounded-md px-3 text-[0.9375rem] transition-colors duration-150 hover:text-heading",
                  active ? "font-medium text-heading" : "text-body",
                )}
              >
                {link.label}
                <span
                  aria-hidden
                  className={cn(
                    "mt-1 h-0.5 self-stretch rounded-full",
                    active ? "bg-primary" : "bg-transparent",
                  )}
                />
              </Link>
            );
          })}
          {EXTERNAL_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="inline-flex h-11 items-center gap-1 rounded-md px-3 text-[0.9375rem] text-body transition-colors duration-150 hover:text-heading"
            >
              {link.label}
              <IconArrowUpRight aria-hidden className="size-3.5" />
              <span className="sr-only"> ({link.note})</span>
            </a>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1 lg:gap-2">
          <ThemeToggle />
          <Button asChild variant="text" size="sm" className="hidden lg:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild variant="solid" color="primary" size="sm">
            <Link href={HEADER_CTA.href}>{HEADER_CTA.label}</Link>
          </Button>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              className="inline-flex size-11 items-center justify-center rounded-md text-body hover:bg-hover lg:hidden"
              aria-label="Open menu"
            >
              <IconMenu2 className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[22rem] p-6">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <nav aria-label="Main" className="flex flex-col gap-1">
                {INTERNAL_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={pathname === link.href ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex min-h-11 items-center rounded-md px-3 text-[1rem]",
                      pathname === link.href ? "font-medium text-primary" : "text-body hover:bg-hover",
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <span className="my-2 border-t border-border" />
                {EXTERNAL_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="flex min-h-11 items-center gap-1 rounded-md px-3 text-[1rem] text-body hover:bg-hover"
                  >
                    {link.label}
                    <IconArrowUpRight aria-hidden className="size-3.5" />
                    <span className="sr-only"> ({link.note})</span>
                  </a>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
                <Button asChild variant="outline" size="md">
                  <Link href="/login" onClick={() => setMenuOpen(false)}>
                    Sign in
                  </Link>
                </Button>
                <Button asChild variant="solid" color="primary" size="md">
                  <Link href={HEADER_CTA.href} onClick={() => setMenuOpen(false)}>
                    {HEADER_CTA.label}
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
