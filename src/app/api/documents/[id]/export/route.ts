import { requireUser } from "@/server/auth";
import { exportDocument } from "@/server/documents";
import { AppError } from "@/server/errors";
import { route } from "@/server/handler";

type Ctx = { params: Promise<{ id: string }> };

// Download a document to this device as Markdown (?format=md, the default) or plain text (?format=txt).
export const GET = route<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const format = new URL(req.url).searchParams.get("format") ?? "md";
  if (format !== "md" && format !== "txt") throw new AppError("validation", "Format must be md or txt.");
  const file = await exportDocument((await params).id, user.id, format);
  return new Response(file.body, {
    headers: { "Content-Type": file.contentType, "Content-Disposition": file.disposition, "Cache-Control": "no-store" },
  });
});
