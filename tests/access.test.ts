import { describe, expect, it } from "vitest";
import { canEdit, canManage, canView, checkShare, getRole } from "@/lib/access";

const doc = { ownerId: "alice", sharedWith: ["bob"] };

describe("document access rules", () => {
  it("gives the owner full control", () => {
    expect(getRole(doc, "alice")).toBe("owner");
    expect(canManage(doc, "alice")).toBe(true);
  });

  it("lets a shared user view and edit, but not manage sharing", () => {
    expect(getRole(doc, "bob")).toBe("editor");
    expect(canView(doc, "bob")).toBe(true);
    expect(canEdit(doc, "bob")).toBe(true);
    expect(canManage(doc, "bob")).toBe(false);
  });

  it("denies everything to users the doc was not shared with", () => {
    expect(getRole(doc, "carol")).toBeNull();
    expect(canView(doc, "carol")).toBe(false);
    expect(canEdit(doc, "carol")).toBe(false);
  });

  it("only lets the owner share, and blocks self-shares and duplicates", () => {
    expect(checkShare(doc, "alice", "carol")).toEqual({ ok: true });
    expect(checkShare(doc, "bob", "carol")).toEqual({ ok: false, reason: "not_owner" });
    expect(checkShare(doc, "alice", "alice")).toEqual({ ok: false, reason: "self_share" });
    expect(checkShare(doc, "alice", "bob")).toEqual({ ok: false, reason: "already_shared" });
  });
});
