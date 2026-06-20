"use client";

import { useEffect } from "react";

/**
 * Registers the custom service worker shipped at `/sw.js`.
 *
 * - Disabled in development to avoid stale caches blocking HMR.
 * - Uses `updateViaCache: "none"` so the SW file itself is never served from
 *   the HTTP cache — required for reliable updates.
 * - On a new SW install, asks the waiting worker to skip waiting so users
 *   get the new version on the next navigation rather than the next launch.
 *
 * This component renders nothing.
 */
export const ServiceWorkerRegistrar: React.FC = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        if (cancelled) return;

        // Promote a freshly-installed worker as soon as it's ready.
        const onUpdate = () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              installing.postMessage("SKIP_WAITING");
            }
          });
        };
        registration.addEventListener("updatefound", onUpdate);

        // Re-check for updates when the tab regains focus — keeps long-lived
        // PWA sessions on the latest version.
        const onFocus = () => registration.update().catch(() => {});
        window.addEventListener("focus", onFocus);

        return () => {
          window.removeEventListener("focus", onFocus);
          registration.removeEventListener("updatefound", onUpdate);
        };
      } catch (err) {
        // Don't surface; SW is a progressive enhancement.
        console.warn("[sw] registration failed", err);
      }
    };

    register();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
};
