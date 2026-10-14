import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { deleteDocument, getDocument, updateDocument } from "@/server/documents";
import { readJson, route } from "@/server/handler";
import { parse, updateDocumentSchema } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  return NextResponse.json(await getDocument((await params).id, user.id));
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const input = parse(updateDocumentSchema, await readJson(req));
  return NextResponse.json(await updateDocument((await params).id, user.id, input));
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  await deleteDocument((await params).id, user.id);
  return new NextResponse(null, { status: 204 });
});
