"use client";
// Live updates by polling: while the tab is visible, fetch the document every few seconds and show
// other people's saved changes. Never saves anything itself. Paused while the tab is hidden.
import { useEffect, useRef } from "react";
import { api, ApiError } from "@/lib/api";
import { decideRemoteUpdate, POLL_INTERVAL_MS } from "@/lib/liveUpdate";
import type { Latest } from "./useDocumentSaver";

interface Options {
  docId: string;
  enabled: boolean; // false once saving has stopped for good (deleted or view-only)
  getVersion: () => number;
  isBusy: () => boolean; // unsaved local work, including an uncommitted title
  lastEditAt: () => number | null;
  onRemote: (latest: Latest) => void;
  onStop: (reason: "gone" | "readonly") => void;
}

export function useLiveUpdates(options: Options) {
  const opts = useRef(options);
  opts.current = options;
  const { docId, enabled } = options;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let running = false;

    async function check() {
      if (running || cancelled || document.visibilityState !== "visible") return;
      running = true;
      try {
        const latest = await api<Latest>(`/api/documents/${docId}`, { cache: "no-store" });
        if (cancelled) return;
        const o = opts.current;
        const decision = decideRemoteUpdate({
          serverVersion: latest.version,
          localVersion: o.getVersion(),
          hasUnsaved: o.isBusy(),
          lastEditAt: o.lastEditAt(),
          now: Date.now(),
        });
        if (decision === "apply") o.onRemote(latest);
      } catch (e) {
        if (cancelled || !(e instanceof ApiError)) return; // offline: try again next tick
        if (e.status === 404) opts.current.onStop("gone");
        else if (e.status === 403) opts.current.onStop("readonly");
      } finally {
        running = false;
      }
    }

    const interval = setInterval(check, POLL_INTERVAL_MS);
    const onVisible = () => document.visibilityState === "visible" && void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [docId, enabled]);
}
