import { IconChevronDown } from "@tabler/icons-react";

import { cn } from "@/lib/cn";

export type FaqItem = {
  question: string;
  answer: React.ReactNode;
};

/** FAQ list using native details/summary (docs/design/marketing-site.md). */
export function FaqList({ items, className }: { items: FaqItem[]; className?: string }) {
  return (
    <div className={cn("divide-y divide-border rounded-lg border border-border bg-surface", className)}>
      {items.map((item) => (
        <details key={item.question} className="group px-5 py-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-[1.067rem] font-medium text-heading [&::-webkit-details-marker]:hidden">
            {item.question}
            <IconChevronDown
              aria-hidden
              className="size-4 shrink-0 text-muted transition-transform duration-150 group-open:rotate-180"
            />
          </summary>
          <div className="mt-3 pb-1 text-[1rem] leading-[1.65] text-body">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}
