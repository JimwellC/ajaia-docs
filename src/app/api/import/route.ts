import { NextResponse } from "next/server";
import { createDocument } from "@/lib/documents";
import { jsonError, requireUser } from "@/lib/http";
import { fileToDocument, ImportError } from "@/lib/importFile";

export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError(400, "Choose a file to upload.");

  try {
    const { title, html } = await fileToDocument(file.name, Buffer.from(await file.arrayBuffer()));
    const id = await createDocument(user.id, title, html);
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    if (e instanceof ImportError) return jsonError(400, e.message);
    console.error("Import failed", e);
    return jsonError(500, "Something went wrong while importing the file.");
  }
}
