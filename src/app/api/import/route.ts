import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { importDocument } from "@/server/documents";
import { AppError } from "@/server/errors";
import { route } from "@/server/handler";

export const POST = route(async (req) => {
  const user = await requireUser(req);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new AppError("validation", "Choose a file to upload.");
  const id = await importDocument(user.id, file.name, Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ id }, { status: 201 });
});
