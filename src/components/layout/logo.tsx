import Link from "next/link";

import { cn } from "@/lib/cn";
import { siteConfig } from "@/config/site";

/** SupportSeal mark: mint tile, ink speech-bubble glyph (docs/design/brand.md). */
export function SealMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="9" fill="var(--vx-brand-mint)" />
      <path
        d="M16 7.5c-4 0-7.2 2.7-7.2 6.1 0 1.9 1 3.6 2.7 4.7v3.2c0 .8.9 1.3 1.6.9l2.9-1.8c4-.2 7.2-3 7.2-7 0-3.4-3.2-6.1-7.2-6.1Z"
        fill="var(--vx-brand-ink)"
      />
      <path
        d="m13.6 14.2 1.9 1.9 3.5-3.9"
        fill="none"
        stroke="var(--vx-brand-mint)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  collapsed = false,
  href = "/inbox",
  className,
}: { collapsed?: boolean; href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-3 overflow-hidden", className)}>
      <SealMark size={32} />
      <span
        className={cn(
          "min-w-0 truncate text-[1.375rem] font-semibold tracking-[-0.01em] text-heading transition-opacity",
          collapsed && "opacity-0 lg:hidden",
        )}
      >
        {siteConfig.name}
      </span>
    </Link>
  );
}
