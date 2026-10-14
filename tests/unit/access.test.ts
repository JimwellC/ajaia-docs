import { describe, expect, it } from "vitest";
import { canEdit, canManage, canView, checkShare, getRole, type DocAccessInfo } from "@/lib/access";

const doc: DocAccessInfo = {
  ownerId: "jimwell",
  grants: [
    { userId: "jim", role: "editor" },
    { userId: "jc", role: "viewer" },
  ],
};

describe("document access rules", () => {
  it("gives the owner full control", () => {
    expect(getRole(doc, "jimwell")).toBe("owner");
    expect(canEdit(doc, "jimwell")).toBe(true);
    expect(canManage(doc, "jimwell")).toBe(true);
  });

  it("lets an editor view and edit, but not manage sharing", () => {
    expect(getRole(doc, "jim")).toBe("editor");
    expect(canView(doc, "jim")).toBe(true);
    expect(canEdit(doc, "jim")).toBe(true);
    expect(canManage(doc, "jim")).toBe(false);
  });

  it("makes viewers read-only", () => {
    expect(getRole(doc, "jc")).toBe("viewer");
    expect(canView(doc, "jc")).toBe(true);
    expect(canEdit(doc, "jc")).toBe(false);
    expect(canManage(doc, "jc")).toBe(false);
  });

  it("denies everything to users without a grant", () => {
    expect(getRole(doc, "dave")).toBeNull();
    expect(canView(doc, "dave")).toBe(false);
    expect(canEdit(doc, "dave")).toBe(false);
  });

  it("only lets the owner share, and blocks self-shares and duplicates", () => {
    expect(checkShare(doc, "jimwell", "dave")).toEqual({ ok: true });
    expect(checkShare(doc, "jim", "dave")).toEqual({ ok: false, reason: "not_owner" });
    expect(checkShare(doc, "jimwell", "jimwell")).toEqual({ ok: false, reason: "self_share" });
    expect(checkShare(doc, "jimwell", "jc")).toEqual({ ok: false, reason: "already_shared" });
  });
});
