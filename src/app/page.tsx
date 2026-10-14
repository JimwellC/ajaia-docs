import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listDocuments } from "@/server/documents";
import AppShell from "@/components/AppShell";
import HomeDashboard, { type View } from "@/components/HomeDashboard";

export const dynamic = "force-dynamic";

const VIEWS: View[] = ["all", "private", "shared"];

export default async function Home({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { owned, shared } = await listDocuments(user.id);
  const requested = (await searchParams).view as View | undefined;
  const initialView = requested && VIEWS.includes(requested) ? requested : "all";

  return (
    <AppShell user={user} owned={owned} shared={shared}>
      <HomeDashboard userName={user.name} owned={owned} shared={shared} initialView={initialView} />
    </AppShell>
  );
}
