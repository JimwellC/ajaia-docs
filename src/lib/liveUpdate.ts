// Live updates by polling: decides whether a newer server version can replace what the editor shows.
// Local work always wins here; if the user has unsaved or recent edits, the next save hits the 409 conflict flow instead.

export const POLL_INTERVAL_MS = 4000;
export const TYPING_GRACE_MS = 2000;

export interface LiveState {
  serverVersion: number;
  localVersion: number;
  hasUnsaved: boolean; // pending or in-flight save, an uncommitted title, or a blocked (conflict/gone/readonly) saver
  lastEditAt: number | null;
  now: number;
}

export type LiveDecision = "none" | "apply" | "skip";

export function decideRemoteUpdate(s: LiveState): LiveDecision {
  if (s.serverVersion <= s.localVersion) return "none";
  if (s.hasUnsaved) return "skip";
  if (s.lastEditAt !== null && s.now - s.lastEditAt < TYPING_GRACE_MS) return "skip";
  return "apply";
}
