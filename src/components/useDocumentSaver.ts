"use client";
// Debounced, serialized saving with optimistic concurrency.
// Title and content changes share one queue, so saves never race each other,
// and every save sends the version it is based on so concurrent edits are detected.
// "saved" is only ever set after the server confirms a save.
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";

export type SaveState =
  | "saved"
  | "dirty"
  | "saving"
  | "error" // the server rejected the save; Retry is manual
  | "offline" // the request never reached the server; retries automatically
  | "conflict" // someone else saved first
  | "gone" // 404: deleted or access removed; saving stops
  | "readonly"; // 403: downgraded to viewer; saving stops
export interface Patch {
  title?: string;
  content?: string;
}
export interface Latest {
  title: string;
  content: string;
  version: number;
}

const DEBOUNCE_MS = 800;
const OFFLINE_RETRY_MS = 5000;

type Outcome = "ok" | "offline" | "failed";

export function useDocumentSaver(
  docId: string,
  initialVersion: number,
  options: { onSaved?: (patch: Patch) => void } = {},
) {
  const [state, setState] = useState<SaveState>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null); // last server-confirmed save
  const onSaved = useRef(options.onSaved);
  onSaved.current = options.onSaved;
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState<Latest | null>(null);
  const version = useRef(initialVersion);
  const pending = useRef<Patch | null>(null);
  const inFlight = useRef<Promise<Outcome> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blocked = useRef(false); // true while a conflict is unresolved, or for good after a 404 or 403
  const offline = useRef(false); // true while the server is unreachable and a retry is scheduled

  const flush = useCallback(async (): Promise<void> => {
    if (timer.current) clearTimeout(timer.current);
    if (inFlight.current) await inFlight.current;
    if (!pending.current || blocked.current) return;

    const patch = pending.current;
    pending.current = null;
    // While offline, keep the "can't reach the server" message up during retries.
    if (!offline.current) setState("saving");

    inFlight.current = (async (): Promise<Outcome> => {
      try {
        const res = await api<{ version: number }>(`/api/documents/${docId}`, {
          method: "PATCH",
          json: { ...patch, version: version.current },
        });
        version.current = res.version;
        offline.current = false;
        setError("");
        setLastSavedAt(Date.now());
        setState(pending.current ? "dirty" : "saved");
        onSaved.current?.(patch);
        return "ok";
      } catch (e) {
        // Put the unsaved changes back (newer edits made during the request win).
        pending.current = { ...patch, ...pending.current };
        if (!(e instanceof ApiError)) {
          // fetch itself threw: the server was never reached.
          offline.current = true;
          setState("offline");
          return "offline";
        }
        offline.current = false;
        if (e.code === "conflict") {
          blocked.current = true;
          setConflict((e.body.latest as Latest) ?? null);
          setState("conflict");
        } else if (e.status === 404) {
          blocked.current = true;
          setState("gone");
        } else if (e.status === 403) {
          blocked.current = true;
          setState("readonly");
        } else {
          setError(e.message);
          setState("error");
        }
        return "failed";
      } finally {
        inFlight.current = null;
      }
    })();
    const outcome = await inFlight.current;
    if (!pending.current || blocked.current) return;
    if (outcome === "offline") timer.current = setTimeout(flush, OFFLINE_RETRY_MS);
    // Changes made while a successful request was running get saved right after it.
    // Other failures wait for the manual Retry instead of looping.
    else if (outcome === "ok") timer.current = setTimeout(flush, DEBOUNCE_MS);
  }, [docId]);

  const schedule = useCallback(
    (patch: Patch, delay = DEBOUNCE_MS) => {
      pending.current = { ...pending.current, ...patch };
      // Blocked: never save. Offline: the scheduled retry will pick this edit up.
      if (blocked.current || offline.current) return;
      setState("dirty");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [flush],
  );

  /** Discard local unsaved changes and adopt the server's latest version. */
  const acceptTheirs = useCallback(() => {
    if (conflict) version.current = conflict.version;
    pending.current = null;
    blocked.current = false;
    setConflict(null);
    setState("saved");
    return conflict;
  }, [conflict]);

  /** Overwrite the server with the local version, based on the latest server version. */
  const keepMine = useCallback(
    (local: Patch) => {
      if (conflict) version.current = conflict.version;
      pending.current = { ...local };
      blocked.current = false;
      setConflict(null);
      void flush();
    },
    [conflict, flush],
  );

  const hasUnsaved = () => pending.current !== null || inFlight.current !== null;

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsaved()) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      void flush(); // save anything pending when navigating away inside the app
    };
  }, [flush]);

  return { state, error, conflict, lastSavedAt, schedule, flush, acceptTheirs, keepMine };
}
