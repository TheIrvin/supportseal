import Link from "next/link";
import { cn } from "@/lib/cn";
import { siteConfig } from "@/config/site";

export function Logo({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-3 overflow-hidden", className)}>
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden className="shrink-0">
        <defs>
          <linearGradient id="vx-logo" x1="0" y1="0" x2="32" y2="32">
            <stop stopColor="var(--vx-primary-light)" />
            <stop offset="1" stopColor="var(--vx-primary)" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="16" fill="url(#vx-logo)" />
        <path
          d="M8.5 8.5h4.4L16 18.2 19.1 8.5h4.4L16.9 23.5h-1.8L8.5 8.5Z"
          fill="white"
        />
      </svg>
      <span
        className={cn(
          "text-[1.375rem] font-bold tracking-tight text-heading transition-opacity",
          collapsed && "opacity-0 lg:hidden",
        )}
      >
        {siteConfig.name}
      </span>
    </Link>
  );
}
