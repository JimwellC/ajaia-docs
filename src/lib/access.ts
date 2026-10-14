// Access rules as pure functions: no database or framework code, so they are easy to test and reuse.

export type ShareRole = "viewer" | "editor";
export type Role = "owner" | ShareRole;

export interface AccessGrant {
  userId: string;
  role: ShareRole;
}

export interface DocAccessInfo {
  ownerId: string;
  grants: AccessGrant[];
}

/** The role a user has on a document, or null if they have no access. */
export function getRole(doc: DocAccessInfo, userId: string): Role | null {
  if (doc.ownerId === userId) return "owner";
  return doc.grants.find((g) => g.userId === userId)?.role ?? null;
}

export const canView = (doc: DocAccessInfo, userId: string) => getRole(doc, userId) !== null;

/** Owners and editors can change content and the title. Viewers are read-only. */
export function canEdit(doc: DocAccessInfo, userId: string) {
  const role = getRole(doc, userId);
  return role === "owner" || role === "editor";
}

/** Only the owner manages sharing and deletes the document. */
export const canManage = (doc: DocAccessInfo, userId: string) => getRole(doc, userId) === "owner";

export type ShareCheck = { ok: true } | { ok: false; reason: "not_owner" | "self_share" | "already_shared" };

export function checkShare(doc: DocAccessInfo, actorId: string, targetUserId: string): ShareCheck {
  if (!canManage(doc, actorId)) return { ok: false, reason: "not_owner" };
  if (targetUserId === doc.ownerId) return { ok: false, reason: "self_share" };
  if (doc.grants.some((g) => g.userId === targetUserId)) return { ok: false, reason: "already_shared" };
  return { ok: true };
}
