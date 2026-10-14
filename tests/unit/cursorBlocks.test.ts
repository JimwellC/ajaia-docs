import { describe, expect, it } from "vitest";
import { colorFor, visibleCursors } from "@/lib/cursorBlocks";
import { presenceSchema } from "@/server/validation";

describe("presence cursorBlock validation", () => {
  it("accepts a non-negative integer or null, and defaults to null", () => {
    expect(presenceSchema.parse({ typing: false, cursorBlock: 0 }).cursorBlock).toBe(0);
    expect(presenceSchema.parse({ typing: true, cursorBlock: 7 }).cursorBlock).toBe(7);
    expect(presenceSchema.parse({ typing: false, cursorBlock: null }).cursorBlock).toBeNull();
    expect(presenceSchema.parse({ typing: false }).cursorBlock).toBeNull();
  });

  it("rejects negative, fractional and non-numeric values", () => {
    for (const cursorBlock of [-1, 1.5, "2", true]) {
      expect(presenceSchema.safeParse({ typing: false, cursorBlock }).success).toBe(false);
    }
  });
});

describe("visibleCursors", () => {
  const others = [
    { id: "a", cursorBlock: 0 },
    { id: "b", cursorBlock: 2 },
    { id: "c", cursorBlock: 3 },
    { id: "d", cursorBlock: null },
  ];

  it("hides cursors whose block is out of range or missing", () => {
    expect(visibleCursors(others, 3).map((p) => p.id)).toEqual(["a", "b"]);
    expect(visibleCursors(others, 0)).toEqual([]);
  });

  it("gives each user a stable color", () => {
    expect(colorFor("u_jim")).toBe(colorFor("u_jim"));
    expect(colorFor("u_jim")).toMatch(/^#[0-9a-f]{6}$/);
  });
});
