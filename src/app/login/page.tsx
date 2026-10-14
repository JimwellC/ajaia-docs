import { redirect } from "next/navigation";
import { getCurrentUser, listUsers } from "@/lib/session";
import SignInButtons from "@/components/SignInButtons";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  const users = await listUsers();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-3xl font-bold">Ajaia Docs</h1>
      <p className="mt-2 text-stone-600">
        Demo sign-in. Pick an account to continue. Sign in as a different user to test sharing.
      </p>
      <SignInButtons users={users} />
    </main>
  );
}
