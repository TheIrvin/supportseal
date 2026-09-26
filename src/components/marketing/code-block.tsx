import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/cn";

/**
 * Code snippet block (docs/design/marketing-site.md, `CodeBlock`): 14px
 * monospace on `bg-surface-2`, horizontal scroll inside a focusable,
 * labelled region, `CopyButton` top-right. No client-side syntax highlighter;
 * optional hand-authored children may tint strings/comments with tokens.
 */
export function CodeBlock({
  code,
  label,
  children,
  className,
}: {
  /** Raw snippet used for copying. */
  code: string;
  /** Accessible name for the scroll region. */
  label: string;
  /** Optional pre-authored content; defaults to the raw code. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative rounded-lg border border-border bg-surface-2", className)}>
      <div className="absolute end-2 top-2 z-10">
        <CopyButton value={code} label="Copy" size="xs" />
      </div>
      <div
        tabIndex={0}
        role="region"
        aria-label={label}
        className="overflow-x-auto rounded-lg p-4 pe-24"
      >
        <pre className="font-mono text-[0.933rem] leading-relaxed text-heading">
          <code>{children ?? code}</code>
        </pre>
      </div>
    </div>
  );
}
