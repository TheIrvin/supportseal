import { NextResponse } from "next/server";

import { COLLECTOR_JS } from "@/lib/diagnostics/collector-source";

export const dynamic = "force-dynamic";

/**
 * The optional diagnostics collector bundle
 * (docs/design/diagnostics.md "Architecture"): fetched by the widget loader
 * only when `/api/widget/config` says `diagnostics: true`, so disabled
 * Products run no capture code. Served as plain JS like the loader.
 */
export async function GET() {
  return new NextResponse(COLLECTOR_JS, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=300",
      "access-control-allow-origin": "*",
    },
  });
}
