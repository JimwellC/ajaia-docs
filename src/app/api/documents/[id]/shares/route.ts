import { NextResponse } from "next/server";
import { canView, checkShare } from "@/lib/access";
import { addShare, findUserByEmail, getDocument } from "@/lib/documents";
import { jsonError, requireUser } from "@/lib/http";

const MESSAGES = {
  not_owner: "Only the owner can share this document.",
  self_share: "You already own this document.",
  already_shared: "This person already has access.",
} as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (response) return response;
  const id = (await params).id;
  const doc = await getDocument(id);
  if (!doc || !canView(doc, user.id)) return jsonError(404, "Document not found.");

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email) return jsonError(400, "Enter an email address.");

  const target = await findUserByEmail(email);
  if (!target) return jsonError(404, "No user with that email. Try one of the demo accounts.");

  const check = checkShare(doc, user.id, target.id);
  if (!check.ok) return jsonError(check.reason === "not_owner" ? 403 : 409, MESSAGES[check.reason]);

  await addShare(id, target.id);
  return NextResponse.json({ ok: true, user: target }, { status: 201 });
}
