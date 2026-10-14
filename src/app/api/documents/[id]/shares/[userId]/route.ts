import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { changeShareRole, removeShare } from "@/server/documents";
import { readJson, route } from "@/server/handler";
import { parse, updateShareSchema } from "@/server/validation";

type Ctx = { params: Promise<{ id: string; userId: string }> };

export const PATCH = route<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const { id, userId } = await params;
  const { role } = parse(updateShareSchema, await readJson(req));
  await changeShareRole(id, user.id, userId, role);
  return NextResponse.json({ ok: true });
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const { id, userId } = await params;
  await removeShare(id, user.id, userId);
  return new NextResponse(null, { status: 204 });
});
