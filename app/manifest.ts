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
 * - `share_target` registers the installed PWA as a system share target so
 *   users can share a receipt photo / PDF from any other app and have it
 *   land on `/import`. The action route accepts multipart/form-data and
 *   redirects to the import page with a session id.
 */

// `share_target` is a valid manifest member but not yet in Next.js'
// `MetadataRoute.Manifest` typings. We extend the return type locally so we
// keep type-safety on the rest of the manifest fields.
type ShareTarget = {
  action: string;
  method: "GET" | "POST";
  enctype?: string;
  params: {
    title?: string;
    text?: string;
    url?: string;
    files?: { name: string; accept: string[] }[];
  };
};

type ManifestWithShareTarget = MetadataRoute.Manifest & {
  share_target?: ShareTarget;
};

export default function manifest(): ManifestWithShareTarget {
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
        name: "Scan receipt",
        short_name: "Scan",
        description: "Open the receipt scanner to import a transaction from a photo",
        url: "/import",
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
    share_target: {
      action: "/api/share",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
        files: [
          {
            name: "file",
            accept: ["image/*", "application/pdf"],
          },
        ],
      },
    },
  };
}
