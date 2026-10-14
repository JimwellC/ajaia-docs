import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { reportPresence } from "@/server/documents";
import { readJson, route } from "@/server/handler";
import { parse, presenceSchema } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };

// Presence heartbeat, sent by the editor's poll. 404 for anyone who can't view the document.
export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const { typing, cursorBlock } = parse(presenceSchema, await readJson(req));
  await reportPresence((await params).id, user.id, typing, cursorBlock);
  return new NextResponse(null, { status: 204 });
});
