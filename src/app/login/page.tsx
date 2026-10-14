import { redirect } from "next/navigation";
import { getCurrentUser, listUsers } from "@/lib/session";
import SignInButtons from "@/components/SignInButtons";
import AppIcon from "@/components/AppIcon";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  const users = await listUsers();
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <AppIcon size={36} />
      <h1 className="mt-5 text-3xl font-bold tracking-tight">Ajaia Docs</h1>
      <p className="mt-2 text-ink-muted">
        Demo sign-in. Pick an account to continue. Sign in as a different user to test sharing.
      </p>
      <SignInButtons users={users} />
    </main>
  );
}
