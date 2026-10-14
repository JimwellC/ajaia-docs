// Block-level cursor indicators: which top-level block each other user's selection is in, and their color.

const COLORS = ["#2f80ed", "#d9730d", "#0f7b6c", "#9065b0", "#e03e3e", "#c29243", "#ad1a72", "#448361"];

/** A stable color per user, derived from their id. */
export function colorFor(userId: string) {
  let h = 0;
  for (const ch of userId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length]!;
}

/** Users whose cursor block exists in the current document; out-of-range or missing indexes are hidden. */
export function visibleCursors<T extends { cursorBlock: number | null }>(others: T[], blockCount: number) {
  return others.filter(
    (p): p is T & { cursorBlock: number } =>
      p.cursorBlock !== null && Number.isInteger(p.cursorBlock) && p.cursorBlock >= 0 && p.cursorBlock < blockCount,
  );
}
