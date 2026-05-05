/**
 * In-memory session store for shared receipt files.
 *
 * The Web Share Target spec hands a file to our server via a POST. The page
 * that ultimately consumes the file is a client component (because OCR runs
 * in the browser), so we need a tiny server-side handoff: stash the file by
 * a short id, redirect to /import?session=<id>, and let the client fetch it.
 *
 * Caveats:
 * - This is process-local. In a serverless / multi-instance deployment the
 *   incoming POST and the subsequent GET must hit the same instance. For this
 *   app's PWA flow that's an acceptable trade-off; revisit if we ever go
 *   multi-region.
 * - Entries auto-expire after `TTL_MS` to bound memory usage. We sweep on
 *   every read so we don't need a timer that keeps the process alive.
 */

const TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface ShareSession {
  /** Base64-encoded data URL of the shared file (image or PDF). */
  dataUrl: string;
  /** Original mime type, e.g. `image/jpeg` or `application/pdf`. */
  mimeType: string;
  /** Original file name if the share target provided one. */
  fileName?: string;
  /** Optional title/text/url metadata from the share intent. */
  title?: string;
  text?: string;
  url?: string;
  /** Epoch ms when the session was created. */
  createdAt: number;
}

interface GlobalWithStore {
  __moneyFlowShareSessions__?: Map<string, ShareSession>;
}

// Reuse the same Map across hot-reload / route invocations within a process.
const globalRef = globalThis as unknown as GlobalWithStore;
const sessions: Map<string, ShareSession> =
  globalRef.__moneyFlowShareSessions__ ?? new Map<string, ShareSession>();
globalRef.__moneyFlowShareSessions__ = sessions;

function sweepExpired(now: number): void {
  for (const [id, session] of sessions) {
    if (now - session.createdAt > TTL_MS) sessions.delete(id);
  }
}

/** Generate a short, URL-safe session id (no external deps required). */
export function newSessionId(): string {
  // 16 bytes of randomness encoded as hex is collision-safe enough for an
  // ephemeral 10-minute session map. crypto.getRandomValues is available in
  // Node 20+ and all edge runtimes.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function putSession(id: string, session: ShareSession): void {
  sweepExpired(Date.now());
  sessions.set(id, session);
}

/** Get a session by id, returning undefined if missing or expired. */
export function getSession(id: string): ShareSession | undefined {
  const now = Date.now();
  sweepExpired(now);
  const session = sessions.get(id);
  if (!session) return undefined;
  if (now - session.createdAt > TTL_MS) {
    sessions.delete(id);
    return undefined;
  }
  return session;
}

/** Remove a session id (one-shot consumption pattern). */
export function deleteSession(id: string): void {
  sessions.delete(id);
}
