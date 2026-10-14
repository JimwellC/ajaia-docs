// Business rules for documents and sharing. Route handlers and pages call these;
// every function checks access before touching data.
import { canEdit, canManage, canView, checkShare, getRole, type ShareRole } from "@/lib/access";
import { fileToDocument } from "@/lib/importFile";
import { AppError, notFound } from "./errors";
import * as repo from "./repo";
import { sanitizeDocumentHtml } from "./sanitize";

/** Loads a document with its grants. Missing and inaccessible look the same, so ids don't leak. */
async function loadForUser(docId: string, userId: string) {
  const doc = await repo.findDocument(docId);
  if (!doc) throw notFound();
  const access = { ownerId: doc.ownerId, grants: await repo.listGrants(docId) };
  if (!canView(access, userId)) throw notFound();
  return { doc, access };
}

export async function listDocuments(userId: string) {
  const [owned, shared] = await Promise.all([repo.listOwned(userId), repo.listSharedWith(userId)]);
  return { owned, shared };
}

export async function getDocument(docId: string, userId: string) {
  const { doc, access } = await loadForUser(docId, userId);
  const role = getRole(access, userId)!;
  // Only the owner sees the full share list; others just see the owner.
  const collaborators = role === "owner" ? await repo.listCollaborators(docId) : [];
  return { ...doc, role, collaborators };
}

export async function createDocument(userId: string, title?: string, content = "") {
  return repo.insertDocument(userId, title || "Untitled document", content);
}

export async function updateDocument(
  docId: string,
  userId: string,
  input: { title?: string; content?: string; version: number },
) {
  const { access } = await loadForUser(docId, userId);
  if (!canEdit(access, userId)) throw new AppError("forbidden", "You have view-only access to this document.");

  const patch = { title: input.title, content: input.content === undefined ? undefined : sanitizeDocumentHtml(input.content) };
  const result = await repo.updateDocumentIfVersion(docId, input.version, patch);
  if (!result) {
    // Someone saved since this client loaded the document. Send the latest so the UI can resolve it.
    const latest = await repo.findDocument(docId);
    throw new AppError("conflict", "This document was changed by someone else.", {
      latest: latest && { title: latest.title, content: latest.content, version: latest.version },
    });
  }
  return result;
}

export async function deleteDocument(docId: string, userId: string) {
  const { access } = await loadForUser(docId, userId);
  if (!canManage(access, userId)) throw new AppError("forbidden", "Only the owner can delete this document.");
  await repo.deleteDocument(docId);
}

const SHARE_ERRORS = {
  not_owner: new AppError("forbidden", "Only the owner can share this document."),
  self_share: new AppError("validation", "You already own this document."),
  already_shared: new AppError("conflict", "This person already has access."),
};

export async function shareDocument(docId: string, userId: string, email: string, role: ShareRole) {
  const { access } = await loadForUser(docId, userId);
  if (!canManage(access, userId)) throw SHARE_ERRORS.not_owner;
  const target = await repo.findUserByEmail(email);
  if (!target) throw new AppError("not_found", "No user with that email. Try one of the demo accounts.");
  const check = checkShare(access, userId, target.id);
  if (!check.ok) throw SHARE_ERRORS[check.reason];
  await repo.insertShare(docId, target.id, role);
  return { ...target, role };
}

export async function changeShareRole(docId: string, userId: string, targetId: string, role: ShareRole) {
  const { access } = await loadForUser(docId, userId);
  if (!canManage(access, userId)) throw new AppError("forbidden", "Only the owner can change sharing.");
  if (!(await repo.updateShareRole(docId, targetId, role))) throw notFound("Collaborator");
}

export async function removeShare(docId: string, userId: string, targetId: string) {
  const { access } = await loadForUser(docId, userId);
  if (!canManage(access, userId)) throw new AppError("forbidden", "Only the owner can change sharing.");
  if (!(await repo.deleteShare(docId, targetId))) throw notFound("Collaborator");
}

export async function importDocument(userId: string, filename: string, bytes: Buffer) {
  const { title, html } = await fileToDocument(filename, bytes);
  return repo.insertDocument(userId, title, sanitizeDocumentHtml(html));
}
