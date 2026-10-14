import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listDocuments } from "@/lib/documents";
import Header from "@/components/Header";
import DocumentList from "@/components/DocumentList";
import CreateActions from "@/components/CreateActions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { owned, shared } = await listDocuments(user.id);

  return (
    <>
      <Header name={user.name} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-2xl font-bold">Documents</h1>
          <CreateActions />
        </div>
        <DocumentList owned={owned} shared={shared} />
      </main>
    </>
  );
}
