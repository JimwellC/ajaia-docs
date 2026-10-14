import { describe, expect, it } from "vitest";
import { decideRemoteUpdate } from "@/lib/liveUpdate";

const base = { serverVersion: 5, localVersion: 4, hasUnsaved: false, lastEditAt: null, now: 10_000 };

describe("decideRemoteUpdate", () => {
  it("does nothing when the server is not newer", () => {
    expect(decideRemoteUpdate({ ...base, serverVersion: 4 })).toBe("none");
    expect(decideRemoteUpdate({ ...base, serverVersion: 3 })).toBe("none");
  });

  it("applies a newer version when the user is idle with nothing unsaved", () => {
    expect(decideRemoteUpdate(base)).toBe("apply");
    expect(decideRemoteUpdate({ ...base, lastEditAt: 7_000 })).toBe("apply");
  });

  it("skips while a save is pending, in flight or blocked", () => {
    expect(decideRemoteUpdate({ ...base, hasUnsaved: true })).toBe("skip");
  });

  it("skips when the user typed in the last 2 seconds", () => {
    expect(decideRemoteUpdate({ ...base, lastEditAt: 8_500 })).toBe("skip");
  });
});
