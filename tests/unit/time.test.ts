import { describe, expect, it } from "vitest";
import { greeting, relativeTime } from "@/lib/time";

const now = new Date("2026-10-14T18:00:00Z").getTime();
const ago = (s: number) => new Date(now - s * 1000);

describe("relative time", () => {
  it("formats recent and older edits", () => {
    expect(relativeTime(ago(10), now)).toBe("just now");
    expect(relativeTime(ago(60), now)).toBe("1 minute ago");
    expect(relativeTime(ago(2 * 60), now)).toBe("2 minutes ago");
    expect(relativeTime(ago(2 * 3600 + 120), now)).toBe("2 hours ago");
    expect(relativeTime(ago(26 * 3600), now)).toBe("yesterday");
    expect(relativeTime(ago(3 * 86400), now)).toBe("3 days ago");
    expect(relativeTime(ago(15 * 86400), now)).toBe("2 weeks ago");
  });

  it("greets by local hour", () => {
    expect(greeting(6)).toBe("Good morning");
    expect(greeting(13)).toBe("Good afternoon");
    expect(greeting(19)).toBe("Good evening");
    expect(greeting(2)).toBe("Good evening");
  });
});
