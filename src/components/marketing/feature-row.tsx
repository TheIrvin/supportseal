import { cn } from "@/lib/cn";

/**
 * Feature row: kicker (optional) + h3 + body on one side, media on the
 * other. 5/7 split on `lg`, alternating sides via `reverse`; stacked below
 * `lg` so screenshots stay readable (docs/design/marketing-site.md).
 */
export function FeatureRow({
  title,
  kicker,
  children,
  media,
  reverse = false,
  actions,
  className,
}: {
  title: React.ReactNode;
  kicker?: React.ReactNode;
  children: React.ReactNode;
  media?: React.ReactNode;
  reverse?: boolean;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-8 lg:grid-cols-12 lg:gap-12", className)}>
      <div className={cn("flex min-w-0 flex-col justify-center lg:col-span-5", reverse && "lg:order-2")}>
        {kicker ? (
          <p className="text-[0.867rem] font-semibold tracking-[0.04em] text-primary">{kicker}</p>
        ) : null}
        <h3 className="mt-2 text-[1.33rem] leading-[1.35] font-semibold tracking-[-0.01em] text-heading">
          {title}
        </h3>
        <div className="mt-3 text-[1.067rem] leading-[1.65] text-body">{children}</div>
        {actions ? <div className="mt-5">{actions}</div> : null}
      </div>
      {media ? <div className={cn("min-w-0 lg:col-span-7", reverse && "lg:order-1")}>{media}</div> : null}
    </div>
  );
}
