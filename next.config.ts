import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // LAN dev access (same convention as vauxey-theme): allow this machine's LAN
  // host so HMR/dev resources work when testing from another device. Additional
  // hosts via DEV_ALLOWED_ORIGINS in the shell environment.
  allowedDevOrigins: [
    "192.168.1.107",
    ...(process.env.DEV_ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) ?? []),
  ],
};

export default nextConfig;
