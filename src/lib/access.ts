// Access rules live here as pure functions so they are easy to test and reuse.

export type Role = "owner" | "editor";

export interface DocAccessInfo {
  ownerId: string;
  sharedWith: string[]; // user ids with access
}

/** Returns the role a user has on a document, or null if they have no access. */
export function getRole(doc: DocAccessInfo, userId: string): Role | null {
  if (doc.ownerId === userId) return "owner";
  if (doc.sharedWith.includes(userId)) return "editor";
  return null;
}

export function canView(doc: DocAccessInfo, userId: string) {
  return getRole(doc, userId) !== null;
}

/** Owners and people a doc is shared with can edit content and the title. */
export function canEdit(doc: DocAccessInfo, userId: string) {
  return getRole(doc, userId) !== null;
}

/** Only the owner can manage sharing or delete the document. */
export function canManage(doc: DocAccessInfo, userId: string) {
  return getRole(doc, userId) === "owner";
}

export type ShareCheck =
  | { ok: true }
  | { ok: false; reason: "not_owner" | "self_share" | "already_shared" };

export function checkShare(doc: DocAccessInfo, actorId: string, targetUserId: string): ShareCheck {
  if (!canManage(doc, actorId)) return { ok: false, reason: "not_owner" };
  if (targetUserId === doc.ownerId) return { ok: false, reason: "self_share" };
  if (doc.sharedWith.includes(targetUserId)) return { ok: false, reason: "already_shared" };
  return { ok: true };
}
