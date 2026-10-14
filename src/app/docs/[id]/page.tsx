import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getDocument } from "@/lib/documents";
import { canView, getRole } from "@/lib/access";
import Header from "@/components/Header";
import DocumentEditor from "@/components/DocumentEditor";

export const dynamic = "force-dynamic";

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const doc = await getDocument((await params).id);
  if (!doc || !canView(doc, user.id)) notFound();

  return (
    <>
      <Header name={user.name} />
      <DocumentEditor
        doc={{
          id: doc.id,
          title: doc.title,
          content: doc.content,
          ownerName: doc.ownerName,
          collaborators: doc.collaborators,
        }}
        role={getRole(doc, user.id)!}
      />
    </>
  );
}
