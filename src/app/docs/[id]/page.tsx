import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getDocument } from "@/server/documents";
import { AppError } from "@/server/errors";
import Header from "@/components/Header";
import DocumentEditor from "@/components/DocumentEditor";

export const dynamic = "force-dynamic";

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const doc = await getDocument((await params).id, user.id).catch((e) => {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  });

  return (
    <>
      <Header name={user.name} />
      <DocumentEditor
        key={doc.id}
        doc={{
          id: doc.id,
          title: doc.title,
          content: doc.content,
          version: doc.version,
          ownerName: doc.ownerName,
          collaborators: doc.collaborators,
        }}
        role={doc.role}
      />
    </>
  );
}
