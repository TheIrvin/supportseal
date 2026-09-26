import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

/**
 * Marketing page section: container, vertical rhythm and the band system
 * that replaces decorative backgrounds (docs/design/marketing-site.md, "Page
 * rhythm and grid"). Adjacent sections alternate `default`/`surface`; at
 * most one `ink` band per page.
 */
const sectionVariants = cva("border-y border-border", {
  variants: {
    band: {
      default: "bg-body-bg",
      surface: "bg-surface",
      ink: "bg-brand-ink",
    },
  },
  defaultVariants: {
    band: "default",
  },
});

export type SectionProps = React.ComponentProps<"section"> & VariantProps<typeof sectionVariants>;

export function Section({ band, className, children, ...props }: SectionProps) {
  return (
    <section className={cn(sectionVariants({ band }), "py-12 sm:py-16 lg:py-24", className)} {...props}>
      <div className="mx-auto w-full max-w-[80rem] px-5 sm:px-8">{children}</div>
    </section>
  );
}

/** Section heading (h2) with optional lead, left-aligned in a prose column. */
export function SectionHeading({
  title,
  lead,
  onInk = false,
  className,
  id,
}: {
  title: React.ReactNode;
  lead?: React.ReactNode;
  onInk?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("max-w-[40rem]", className)}>
      <h2
        id={id}
        className={cn(
          "text-[clamp(1.87rem,1.5rem+1.4vw,2.4rem)] leading-[1.2] font-semibold tracking-[-0.015em]",
          onInk ? "text-white" : "text-heading",
        )}
      >
        {title}
      </h2>
      {lead ? (
        <p className={cn("mt-4 text-[1.2rem] leading-[1.6]", onInk ? "text-[#D3F6E6]" : "text-body")}>{lead}</p>
      ) : null}
    </div>
  );
}
