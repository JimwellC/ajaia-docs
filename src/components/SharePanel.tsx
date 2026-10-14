"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import type { ShareRole } from "@/lib/access";
import type { Collaborator } from "@/server/repo";

const byName = (a: Collaborator, b: Collaborator) => a.name.localeCompare(b.name);

export default function SharePanel({ docId, initial }: { docId: string; initial: Collaborator[] }) {
  const [people, setPeople] = useState(initial);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("editor");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function share(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { collaborator } = await api<{ collaborator: Collaborator }>(`/api/documents/${docId}/shares`, {
        method: "POST",
        json: { email, role },
      });
      setPeople((p) => [...p, collaborator].sort(byName));
      setEmail("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Optimistic updates: change the UI immediately, roll back if the server refuses.
  async function changeRole(userId: string, next: ShareRole) {
    const prev = people;
    setPeople((p) => p.map((x) => (x.id === userId ? { ...x, role: next } : x)));
    try {
      await api(`/api/documents/${docId}/shares/${userId}`, { method: "PATCH", json: { role: next } });
    } catch (e) {
      setPeople(prev);
      setError((e as Error).message);
    }
  }

  async function remove(userId: string) {
    const prev = people;
    setPeople((p) => p.filter((x) => x.id !== userId));
    try {
      await api(`/api/documents/${docId}/shares/${userId}`, { method: "DELETE" });
    } catch (e) {
      setPeople(prev);
      setError((e as Error).message);
    }
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
      <h2 className="font-semibold">Sharing</h2>

      <form onSubmit={share} className="mt-3 space-y-2">
        <label htmlFor="share-email" className="block text-stone-600">Share with (email)</label>
        <input
          id="share-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jim@ajaia.test"
          className="w-full rounded-md border border-stone-300 px-2 py-1.5"
        />
        <div className="flex gap-2">
          <select
            aria-label="Access level"
            value={role}
            onChange={(e) => setRole(e.target.value as ShareRole)}
            className="flex-1 rounded-md border border-stone-300 px-2 py-1.5"
          >
            <option value="editor">Can edit</option>
            <option value="viewer">Can view</option>
          </select>
          <button disabled={busy} className="rounded-md bg-stone-900 px-4 text-white disabled:opacity-60">
            {busy ? "Sharing…" : "Share"}
          </button>
        </div>
        <p className="text-xs text-stone-500">Demo users: jimwell@, jim@, jc@ajaia.test</p>
        {error && <p className="text-red-600" role="alert">{error}</p>}
      </form>

      <p className="mt-4 text-stone-500">People with access</p>
      {people.length === 0 ? (
        <p className="mt-1 text-stone-500">Only you.</p>
      ) : (
        <ul className="mt-1 space-y-2">
          {people.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <span className="min-w-0">
                <span className="block truncate font-medium">{p.name}</span>
                <span className="block truncate text-xs text-stone-500">{p.email}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <select
                  aria-label={`Access for ${p.name}`}
                  value={p.role}
                  onChange={(e) => changeRole(p.id, e.target.value as ShareRole)}
                  className="rounded border border-stone-200 px-1 py-0.5 text-xs"
                >
                  <option value="editor">Can edit</option>
                  <option value="viewer">Can view</option>
                </select>
                <button
                  onClick={() => remove(p.id)}
                  aria-label={`Remove ${p.name}`}
                  className="px-1 text-xs text-stone-500 hover:text-red-600"
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
