import { NextResponse } from "next/server";
import { createDocument, listDocuments, MAX_TITLE } from "@/lib/documents";
import { jsonError, requireUser } from "@/lib/http";

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;
  return NextResponse.json(await listDocuments(user.id));
}

export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  const body = await req.json().catch(() => ({}));
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (title.length > MAX_TITLE) return jsonError(400, `Title must be ${MAX_TITLE} characters or fewer.`);
  const id = await createDocument(user.id, title || undefined);
  return NextResponse.json({ id }, { status: 201 });
}
