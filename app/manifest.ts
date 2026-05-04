import type { MetadataRoute } from "next";

/**
 * Web App Manifest for Money Flow.
 *
 * Served at `/manifest.webmanifest` by Next.js (App Router metadata convention).
 * The browser uses this file to enable "Add to Home Screen" / installability.
 *
 * Notes:
 * - `theme_color` matches the primary brand color (light mode). The actual
 *   address-bar tint can also be controlled per color-scheme via the
 *   `<meta name="theme-color">` tags in `app/layout.tsx`.
 * - `start_url` lands users on the dashboard (not the redirect at `/`).
 * - Both regular and `maskable` icons are provided so Android can render
 *   adaptive icons without an awkward letterboxed background.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Money Flow",
    short_name: "MoneyFlow",
    description: "Pelacak keuangan pribadi",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0b1120",
    theme_color: "#4f46e5",
    categories: ["finance"],
    lang: "id-ID",
    dir: "ltr",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Add transaction",
        short_name: "Add",
        description: "Jump straight to the transactions page to log income or expense",
        url: "/transactions",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        ],
      },
      {
        name: "Analytics",
        short_name: "Analytics",
        description: "Open spending analytics and trends",
        url: "/analytics",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        ],
      },
    ],
  };
}
