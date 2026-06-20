"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Generic localStorage-backed state hook for ad-hoc UI persistence
 * (e.g. a per-page toggle). SSR-safe via `useSyncExternalStore`: the
 * server snapshot returns the JSON of `initial`, while the client snapshot
 * reflects the current localStorage value and updates on `storage` events.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const initialJson = JSON.stringify(initial);

  const subscribe = useCallback(
    (cb: () => void) => {
      const handler = (e: StorageEvent) => {
        if (e.key === key) cb();
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
    [key],
  );

  const getSnapshot = useCallback((): string => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ?? initialJson;
    } catch {
      return initialJson;
    }
  }, [key, initialJson]);

  const getServerSnapshot = useCallback(() => initialJson, [initialJson]);

  const json = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  let value: T;
  try {
    value = JSON.parse(json) as T;
  } catch {
    value = initial;
  }

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      let resolved: T;
      try {
        const current = JSON.parse(window.localStorage.getItem(key) ?? initialJson) as T;
        resolved = typeof next === "function" ? (next as (p: T) => T)(current) : next;
      } catch {
        resolved = typeof next === "function" ? (next as (p: T) => T)(initial) : next;
      }
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
        // `storage` events don't fire in the same tab; nudge subscribers.
        window.dispatchEvent(new StorageEvent("storage", { key }));
      } catch {
        // Quota exceeded or storage disabled — caller can retry.
      }
    },
    [key, initial, initialJson],
  );

  return [value, set] as const;
}
