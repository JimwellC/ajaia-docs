"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { User } from "@/lib/session";

// What each seeded demo account can do with the welcome document, in display order.
const DEMO_ROLES: Record<string, string> = {
  u_jimwell: "Owner of the welcome doc",
  u_jim: "Can edit the welcome doc",
  u_jc: "Can view the welcome doc",
};
const order = (id: string) => {
  const i = Object.keys(DEMO_ROLES).indexOf(id);
  return i === -1 ? Infinity : i;
};

export default function SignInButtons({ users }: { users: User[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function signIn(userId: string) {
    setPending(userId);
    setError("");
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Could not sign in. Please try again.");
      setPending(null);
    }
  }

  return (
    <div className="mt-8 space-y-2">
      {[...users].sort((a, b) => order(a.id) - order(b.id)).map((u) => (
        <button
          key={u.id}
          onClick={() => signIn(u.id)}
          disabled={pending !== null}
          className="flex w-full items-center justify-between rounded-lg bg-sidebar px-4 py-3 text-left transition hover:bg-hover disabled:opacity-60"
        >
          <span>
            <span className="block font-medium">{u.name}</span>
            {DEMO_ROLES[u.id] && <span className="block text-sm text-ink">{DEMO_ROLES[u.id]}</span>}
            <span className="block text-sm text-ink-muted">{u.email}</span>
          </span>
          <span className="shrink-0 text-sm text-ink-muted">{pending === u.id ? "Signing in…" : "Continue →"}</span>
        </button>
      ))}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
