"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Chromium fires `beforeinstallprompt` when the PWA install criteria are
 * met. We capture the event, suppress the default mini-infobar, and surface
 * our own dismissible banner so the prompt doesn't feel intrusive.
 *
 * The event is non-standard (not in TS DOM lib by default), hence the
 * narrow inline interface below.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
}

const DISMISS_KEY = "money-flow:install-dismissed";

// Lazy initial-state readers keep us off the React-19 "no setState in effect"
// rule (the index already records this preference for `useLocalStorage`-style
// reads). We can't touch `window` during SSR, so each reader is guarded.
const readDismissed = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};

const readStandalone = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches;
};

export const InstallPrompt: React.FC = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  // `useState` initializer fires once during the initial render, on the
  // client. Reading from localStorage / matchMedia here avoids the cascading
  // re-render the lint rule warns about.
  const [dismissed, setDismissed] = useState<boolean>(readDismissed);
  const [standalone] = useState<boolean>(readStandalone);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (dismissed || standalone) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [dismissed, standalone]);

  if (dismissed || !deferred) return null;

  const handleInstall = async () => {
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "dismissed") {
        window.localStorage.setItem(DISMISS_KEY, "1");
      }
    } catch {
      /* user-agent already swallowed the prompt */
    } finally {
      setDeferred(null);
    }
  };

  const handleDismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDeferred(null);
    setDismissed(true);
  };

  return (
    <div
      role="dialog"
      aria-label="Install Money Flow"
      className="fixed inset-x-3 z-40 bottom-[calc(env(safe-area-inset-bottom)+72px)] md:inset-x-auto md:right-6 md:bottom-6 md:max-w-sm rounded-2xl border border-border bg-card text-card-foreground shadow-xl shadow-primary/15 animate-fade-in"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="grid place-items-center h-11 w-11 rounded-2xl bg-primary-soft text-primary shrink-0">
          <Download className="h-5 w-5" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Install Money Flow</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add to your home screen so the cat is never far away.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" onClick={handleInstall} className="touch-manipulation">
              Install
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="touch-manipulation"
            >
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
};
