"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/lib/api";

const ACCEPT = ".txt,.md,.docx";

export default function CreateActions() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"new" | "upload" | null>(null);
  const [error, setError] = useState("");

  async function createBlank() {
    setBusy("new");
    setError("");
    try {
      const { id } = await api<{ id: string }>("/api/documents", { method: "POST", json: {} });
      router.push(`/docs/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  async function upload(file: File) {
    setBusy("upload");
    setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const { id } = await api<{ id: string }>("/api/import", { method: "POST", body: form });
      router.push(`/docs/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <div className="flex gap-2">
        <button
          onClick={() => fileInput.current?.click()}
          disabled={busy !== null}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium hover:bg-stone-50 disabled:opacity-60"
        >
          {busy === "upload" ? "Importing…" : "Import file"}
        </button>
        <button
          onClick={createBlank}
          disabled={busy !== null}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {busy === "new" ? "Creating…" : "New document"}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </div>
      <p className="text-xs text-stone-600">Import supports .txt, .md and .docx (max 2 MB)</p>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
    </div>
  );
}
