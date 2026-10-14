import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getDocument, listDocuments } from "@/server/documents";
import { AppError } from "@/server/errors";
import AppShell from "@/components/AppShell";
import DocumentEditor from "@/components/DocumentEditor";

export const dynamic = "force-dynamic";

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [doc, { owned, shared }] = await Promise.all([
    getDocument((await params).id, user.id).catch((e) => {
      if (e instanceof AppError && e.code === "not_found") notFound();
      throw e;
    }),
    listDocuments(user.id),
  ]);

  return (
    <AppShell user={user} owned={owned} shared={shared} currentDocId={doc.id}>
      <DocumentEditor
        key={doc.id}
        doc={{
          id: doc.id,
          title: doc.title,
          content: doc.content,
          version: doc.version,
          ownerName: doc.ownerName,
          updatedAt: new Date(doc.updatedAt).toISOString(),
          collaborators: doc.collaborators,
        }}
        role={doc.role}
      />
    </AppShell>
  );
}
