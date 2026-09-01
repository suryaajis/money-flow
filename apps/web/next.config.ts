import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Turbopack scoped to this monorepo. A stray lockfile in the parent
  // repository directory otherwise makes Next.js watch every sibling project.
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },

  // PWA-related response headers.
  // Critically: `/sw.js` MUST NOT be HTTP-cached, otherwise users would get
  // stuck on a stale service worker. The manifest is small and changes
  // infrequently, but we still set a short max-age so updates ship quickly.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Content-Type", value: "application/manifest+json" },
        ],
      },
      {
        source: "/icons/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
