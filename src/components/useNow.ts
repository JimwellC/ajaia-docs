"use client";
import { useEffect, useState } from "react";

/**
 * The current time, refreshed every 30 seconds. null during server rendering and the first
 * client render, so time-dependent text (relative times, greetings) never causes a hydration mismatch.
 */
export function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
