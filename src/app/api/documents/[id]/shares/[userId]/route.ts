import { NextResponse } from "next/server";
import { canManage, canView } from "@/lib/access";
import { getDocument, removeShare } from "@/lib/documents";
import { jsonError, requireUser } from "@/lib/http";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { user, response } = await requireUser();
  if (response) return response;
  const { id, userId } = await params;
  const doc = await getDocument(id);
  if (!doc || !canView(doc, user.id)) return jsonError(404, "Document not found.");
  if (!canManage(doc, user.id)) return jsonError(403, "Only the owner can change sharing.");
  await removeShare(id, userId);
  return NextResponse.json({ ok: true });
}
