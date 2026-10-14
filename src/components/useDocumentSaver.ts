"use client";
// Debounced, serialized saving with optimistic concurrency.
// Title and content changes share one queue, so saves never race each other,
// and every save sends the version it is based on so concurrent edits are detected.
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";

export type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";
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

export function useDocumentSaver(docId: string, initialVersion: number) {
  const [state, setState] = useState<SaveState>("saved");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState<Latest | null>(null);
  const version = useRef(initialVersion);
  const pending = useRef<Patch | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blocked = useRef(false); // true while a conflict is unresolved

  const flush = useCallback(async (): Promise<void> => {
    if (timer.current) clearTimeout(timer.current);
    if (inFlight.current) await inFlight.current;
    if (!pending.current || blocked.current) return;

    const patch = pending.current;
    pending.current = null;
    setState("saving");

    inFlight.current = (async () => {
      try {
        const res = await api<{ version: number }>(`/api/documents/${docId}`, {
          method: "PATCH",
          json: { ...patch, version: version.current },
        });
        version.current = res.version;
        setError("");
        setState(pending.current ? "dirty" : "saved");
      } catch (e) {
        // Put the unsaved changes back (newer edits made during the request win).
        pending.current = { ...patch, ...pending.current };
        if (e instanceof ApiError && e.code === "conflict") {
          blocked.current = true;
          setConflict((e.body.latest as Latest) ?? null);
          setState("conflict");
        } else {
          setError(e instanceof Error ? e.message : "Couldn't save.");
          setState("error");
        }
      } finally {
        inFlight.current = null;
      }
    })();
    await inFlight.current;
    // Changes made while the request was running get saved right after it.
    if (pending.current && !blocked.current) timer.current = setTimeout(flush, DEBOUNCE_MS);
  }, [docId]);

  const schedule = useCallback(
    (patch: Patch, delay = DEBOUNCE_MS) => {
      pending.current = { ...pending.current, ...patch };
      if (blocked.current) return;
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

  return { state, error, conflict, schedule, flush, acceptTheirs, keepMine };
}
