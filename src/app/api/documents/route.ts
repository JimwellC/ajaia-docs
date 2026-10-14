import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { createDocument, listDocuments } from "@/server/documents";
import { readJson, route } from "@/server/handler";
import { createDocumentSchema, parse } from "@/server/validation";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  return NextResponse.json(await listDocuments(user.id));
});

export const POST = route(async (req) => {
  const user = await requireUser(req);
  const { title } = parse(createDocumentSchema, await readJson(req));
  return NextResponse.json({ id: await createDocument(user.id, title) }, { status: 201 });
});
