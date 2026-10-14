"use client";
import { useState } from "react";

export interface Collaborator {
  id: string;
  name: string;
  email: string;
}

export default function SharePanel({
  docId,
  isOwner,
  initial,
}: {
  docId: string;
  isOwner: boolean;
  initial: Collaborator[];
}) {
  const [people, setPeople] = useState(initial);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function share(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch(`/api/documents/${docId}/shares`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Could not share.");
    setPeople((p) => [...p, data.user].sort((a, b) => a.name.localeCompare(b.name)));
    setEmail("");
  }

  async function remove(userId: string) {
    const prev = people;
    setPeople((p) => p.filter((x) => x.id !== userId)); // optimistic
    const res = await fetch(`/api/documents/${docId}/shares/${userId}`, { method: "DELETE" });
    if (!res.ok) {
      setPeople(prev);
      setError("Could not remove access.");
    }
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
      <h2 className="font-semibold">Sharing</h2>

      {isOwner && (
        <form onSubmit={share} className="mt-3 space-y-2">
          <label htmlFor="share-email" className="block text-stone-600">Share with (email)</label>
          <div className="flex gap-2">
            <input
              id="share-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="bob@ajaia.test"
              className="min-w-0 flex-1 rounded-md border border-stone-300 px-2 py-1.5"
            />
            <button disabled={busy} className="rounded-md bg-stone-900 px-3 text-white disabled:opacity-60">
              {busy ? "…" : "Share"}
            </button>
          </div>
          <p className="text-xs text-stone-500">Demo users: alice@, bob@, carol@ajaia.test</p>
          {error && <p className="text-red-600" role="alert">{error}</p>}
        </form>
      )}

      <p className="mt-4 text-stone-500">People with access</p>
      {people.length === 0 ? (
        <p className="mt-1 text-stone-500">Only the owner.</p>
      ) : (
        <ul className="mt-1 space-y-1.5">
          {people.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <span className="min-w-0">
                <span className="block truncate font-medium">{p.name}</span>
                <span className="block truncate text-xs text-stone-500">{p.email}</span>
              </span>
              {isOwner && (
                <button onClick={() => remove(p.id)} className="text-xs text-stone-500 hover:text-red-600">
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
