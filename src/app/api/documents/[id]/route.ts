import { NextResponse } from "next/server";
import { canEdit, canManage, canView, getRole } from "@/lib/access";
import { deleteDocument, getDocument, MAX_CONTENT_BYTES, MAX_TITLE, updateDocument } from "@/lib/documents";
import { jsonError, requireUser } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { user, response } = await requireUser();
  if (response) return response;
  const doc = await getDocument((await params).id);
  // Same 404 for "missing" and "no access" so document ids don't leak.
  if (!doc || !canView(doc, user.id)) return jsonError(404, "Document not found.");
  return NextResponse.json({ ...doc, role: getRole(doc, user.id) });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { user, response } = await requireUser();
  if (response) return response;
  const id = (await params).id;
  const doc = await getDocument(id);
  if (!doc || !canEdit(doc, user.id)) return jsonError(404, "Document not found.");

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError(400, "Invalid request body.");

  const patch: { title?: string; content?: string } = {};
  if ("title" in body) {
    if (typeof body.title !== "string") return jsonError(400, "Title must be text.");
    const title = body.title.trim();
    if (!title) return jsonError(400, "Title cannot be empty.");
    if (title.length > MAX_TITLE) return jsonError(400, `Title must be ${MAX_TITLE} characters or fewer.`);
    patch.title = title;
  }
  if ("content" in body) {
    if (typeof body.content !== "string") return jsonError(400, "Content must be text.");
    if (Buffer.byteLength(body.content) > MAX_CONTENT_BYTES) return jsonError(413, "Document is too large.");
    patch.content = body.content;
  }
  if (!("title" in patch) && !("content" in patch)) return jsonError(400, "Nothing to update.");

  const updatedAt = await updateDocument(id, patch);
  return NextResponse.json({ ok: true, updatedAt });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { user, response } = await requireUser();
  if (response) return response;
  const id = (await params).id;
  const doc = await getDocument(id);
  if (!doc || !canView(doc, user.id)) return jsonError(404, "Document not found.");
  if (!canManage(doc, user.id)) return jsonError(403, "Only the owner can delete this document.");
  await deleteDocument(id);
  return NextResponse.json({ ok: true });
}
