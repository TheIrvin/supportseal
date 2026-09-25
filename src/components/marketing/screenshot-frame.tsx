import Image from "next/image";

import { cn } from "@/lib/cn";
import { MARKETING_SHOTS } from "@/config/marketing-shots";

export type ShotMarker = {
  /** Position of the marker centre, as percentages of the frame. */
  x: number;
  y: number;
};

/**
 * Figure for a real app screenshot (docs/design/marketing-site.md,
 * "ScreenshotFrame contract"). Renders light/dark variants via next/image.
 *
 * Until the demo seed and capture run exist (open-questions M6) every shot in
 * the manifest is `available: false` and this renders a clearly marked
 * placeholder slot matching the design shot list — never a fake mockup.
 */
export function ScreenshotFrame({
  shotId,
  alt,
  caption,
  markers,
  markerList,
  className,
  eager = false,
}: {
  shotId: string;
  /** Copy slot describing what the image shows (WCAG 1.1.1). */
  alt: string;
  caption?: React.ReactNode;
  /** Up to 3 numbered markers; aria-hidden decoration over the image. */
  markers?: ShotMarker[];
  /** Ordered list carrying the markers' meaning. */
  markerList?: React.ReactNode;
  className?: string;
  /** Hero shot: eager-load the light variant (LCP element). */
  eager?: boolean;
}) {
  const shot = MARKETING_SHOTS[shotId];
  if (!shot) {
    throw new Error(`Unknown marketing shot "${shotId}" — add it to src/config/marketing-shots.ts.`);
  }

  const frameClasses = "overflow-hidden rounded-lg border border-border bg-surface shadow-card";
  const aspect = { aspectRatio: `${shot.width} / ${shot.height}` };

  return (
    <figure className={cn("w-full", className)}>
      {shot.available ? (
        <div className={cn("relative", frameClasses)} style={aspect}>
          <Image
            src={`/marketing/${shot.id}-light.png`}
            alt={alt}
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            priority={eager}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            className="object-cover object-top dark:hidden"
          />
          <Image
            src={`/marketing/${shot.id}-dark.png`}
            alt=""
            aria-hidden
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            loading={eager ? "lazy" : "lazy"}
            className="hidden object-cover object-top dark:block"
          />
          {markers?.slice(0, 3).map((marker, index) => (
            <span
              key={`${marker.x}-${marker.y}`}
              aria-hidden
              className="absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[28%] bg-brand-ink text-[0.75rem] font-semibold text-brand-mint ring-1 ring-white"
              style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
            >
              {index + 1}
            </span>
          ))}
        </div>
      ) : (
        <div
          role="img"
          aria-label={`Screenshot placeholder: ${shot.id} — ${shot.description}. Capture pending.`}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 border-dashed p-8 text-center",
            frameClasses,
          )}
          style={aspect}
        >
          <span className="rounded-md bg-primary-label px-2 py-0.5 text-[0.8125rem] font-semibold text-primary">
            {shot.id}
          </span>
          <p className="max-w-[36rem] text-[0.933rem] text-muted">{shot.description}</p>
          <p className="text-[0.8125rem] text-muted">
            Real capture pending (demo seed not scheduled yet) — no mockups on this site.
          </p>
        </div>
      )}
      {shot.available ? (
        <>
          {/* Zoom affordance on small screens (WCAG 1.4.10). */}
          <a
            href={`/marketing/${shot.id}-light.png`}
            target="_blank"
            rel="noopener"
            className="mt-2 inline-block text-[0.8125rem] text-primary underline underline-offset-4 md:hidden"
          >
            View full size<span className="sr-only"> (light theme screenshot, opens in a new tab)</span>
          </a>
          <a
            href={`/marketing/${shot.id}-dark.png`}
            target="_blank"
            rel="noopener"
            className="mt-2 hidden text-[0.8125rem] text-primary underline underline-offset-4 md:hidden dark:inline-block"
          >
            View full size<span className="sr-only"> (dark theme screenshot, opens in a new tab)</span>
          </a>
        </>
      ) : null}
      {caption ? <figcaption className="mt-3 text-[0.933rem] text-muted">{caption}</figcaption> : null}
      {markerList ? <div className="mt-4">{markerList}</div> : null}
    </figure>
  );
}
