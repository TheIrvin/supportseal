"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";

export type FeaturesNavItem = { id: string; label: string };

/**
 * "On this page" navigation for /features (docs/design/marketing-site.md).
 * Two variants of the same data: `sidebar` is the sticky lg+ navigation
 * column beside the section list; `chips` is the horizontal row shown under
 * the hero heading below lg. Scroll state is recomputed from section
 * positions on every observer callback, so the highlight never sticks on a
 * section that has already left the viewport.
 */
export function FeaturesNav({ items, variant }: { items: FeaturesNavItem[]; variant: "sidebar" | "chips" }) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      () => {
        // The active section is the last one whose top passed the band.
        const threshold = window.innerHeight * 0.25;
        let current = sections[0]!.id;
        for (const section of sections) {
          if (section.getBoundingClientRect().top <= threshold) current = section.id;
        }
        setActiveId(current);
      },
      { rootMargin: "-20% 0% -70% 0%", threshold: 0 },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [items]);

  if (variant === "chips") {
    return (
      <nav
        aria-label="On this page"
        className="-mx-5 mt-8 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0 lg:hidden"
      >
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={activeId === item.id ? "true" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-2 text-[0.875rem] transition-colors duration-150",
              activeId === item.id
                ? "border-primary bg-primary-label font-medium text-primary"
                : "border-border text-body hover:text-heading",
            )}
          >
            {item.label}
          </a>
        ))}
      </nav>
    );
  }

  return (
    <nav
      aria-label="On this page"
      className="sticky top-[calc(var(--vx-header-height)+2rem)] hidden h-fit w-56 lg:block"
    >
      <p className="text-[0.867rem] font-semibold tracking-[0.04em] text-heading">On this page</p>
      <ul className="mt-4 flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={activeId === item.id ? "true" : undefined}
              className={cn(
                "block border-s-2 py-1.5 ps-3 text-[0.933rem] transition-colors duration-150",
                activeId === item.id
                  ? "border-primary font-medium text-heading"
                  : "border-transparent text-muted hover:text-heading",
              )}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
