"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";

export type FeaturesNavItem = { id: string; label: string };

/**
 * "On this page" navigation for /features (docs/design/marketing-site.md):
 * sticky sidebar with a primary left border on the current section (lg+),
 * horizontal chip row below that. The only client island on the page beyond
 * the shared header/footer controls.
 */
export function FeaturesNav({ items }: { items: FeaturesNavItem[] }) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // The topmost section intersecting near the viewport top wins.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0% -70% 0%", threshold: 0 },
    );
    for (const item of items) {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <>
      {/* lg+: sticky sidebar */}
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

      {/* < lg: chip row under the H1, not sticky */}
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
    </>
  );
}
