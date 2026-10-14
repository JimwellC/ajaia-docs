import { describe, expect, it } from "vitest";
import { canEdit, canManage, canView, checkShare, getRole, type DocAccessInfo } from "@/lib/access";

const doc: DocAccessInfo = {
  ownerId: "alice",
  grants: [
    { userId: "bob", role: "editor" },
    { userId: "carol", role: "viewer" },
  ],
};

describe("document access rules", () => {
  it("gives the owner full control", () => {
    expect(getRole(doc, "alice")).toBe("owner");
    expect(canEdit(doc, "alice")).toBe(true);
    expect(canManage(doc, "alice")).toBe(true);
  });

  it("lets an editor view and edit, but not manage sharing", () => {
    expect(getRole(doc, "bob")).toBe("editor");
    expect(canView(doc, "bob")).toBe(true);
    expect(canEdit(doc, "bob")).toBe(true);
    expect(canManage(doc, "bob")).toBe(false);
  });

  it("makes viewers read-only", () => {
    expect(getRole(doc, "carol")).toBe("viewer");
    expect(canView(doc, "carol")).toBe(true);
    expect(canEdit(doc, "carol")).toBe(false);
    expect(canManage(doc, "carol")).toBe(false);
  });

  it("denies everything to users without a grant", () => {
    expect(getRole(doc, "dave")).toBeNull();
    expect(canView(doc, "dave")).toBe(false);
    expect(canEdit(doc, "dave")).toBe(false);
  });

  it("only lets the owner share, and blocks self-shares and duplicates", () => {
    expect(checkShare(doc, "alice", "dave")).toEqual({ ok: true });
    expect(checkShare(doc, "bob", "dave")).toEqual({ ok: false, reason: "not_owner" });
    expect(checkShare(doc, "alice", "alice")).toEqual({ ok: false, reason: "self_share" });
    expect(checkShare(doc, "alice", "carol")).toEqual({ ok: false, reason: "already_shared" });
  });
});
