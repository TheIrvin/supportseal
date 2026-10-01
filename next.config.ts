import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        // Global security headers. Widget surfaces are excluded: the panel
        // sets its own CSP frame-ancestors, and the loader/preview must stay
        // embeddable.
        source: "/((?!widget|widget-preview|api/widget|api/attachments).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
      {
        // Downloadable attachments: nosniff everywhere; framing not needed.
        source: "/api/attachments/:path*",
        headers: [{ key: "X-Content-Type-Options", value: "nosniff" }],
      },
    ];
  },
  // Widget assets served by route handlers under /api/widget/* (docs/design/chat-widget.md).
  async rewrites() {
    return [
      { source: "/widget.js", destination: "/api/widget/js" },
      { source: "/widget", destination: "/api/widget/panel" },
      { source: "/widget-diagnostics.js", destination: "/api/widget/diagnostics-js" },
    ];
  },
  // LAN dev access (same convention as vauxey-theme): allow this machine's LAN
  // host so HMR/dev resources work when testing from another device. Additional
  // hosts via DEV_ALLOWED_ORIGINS in the shell environment.
  allowedDevOrigins: [
    "192.168.1.107",
    ...(process.env.DEV_ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) ?? []),
  ],
};

export default nextConfig;
