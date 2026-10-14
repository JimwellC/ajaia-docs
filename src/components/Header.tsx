"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Header({ name }: { name: string }) {
  const router = useRouter();
  async function signOut() {
    await fetch("/api/session", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0 whitespace-nowrap font-bold tracking-tight">
          Ajaia Docs
        </Link>
        <div className="flex min-w-0 items-center gap-3 text-sm">
          <span className="min-w-0 truncate text-stone-600">
            <span className="hidden sm:inline">Signed in as </span>
            <span className="font-medium text-stone-900">{name}</span>
          </span>
          <button onClick={signOut} className="shrink-0 whitespace-nowrap rounded-lg border border-stone-300 px-3 py-1.5 hover:bg-stone-50">
            Switch user
          </button>
        </div>
      </div>
    </header>
  );
}
