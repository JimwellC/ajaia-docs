import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { shareDocument } from "@/server/documents";
import { readJson, route } from "@/server/handler";
import { parse, shareSchema } from "@/server/validation";

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser(req);
  const { email, role } = parse(shareSchema, await readJson(req));
  const collaborator = await shareDocument((await params).id, user.id, email, role);
  return NextResponse.json({ collaborator }, { status: 201 });
});
