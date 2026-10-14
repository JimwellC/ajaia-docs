"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const ACCEPT = ".txt,.md,.docx";

export default function CreateActions() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"new" | "upload" | null>(null);
  const [error, setError] = useState("");

  async function createBlank() {
    setBusy("new");
    setError("");
    const res = await fetch("/api/documents", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } });
    const data = await res.json().catch(() => ({}));
    if (res.ok) router.push(`/docs/${data.id}`);
    else {
      setError(data.error ?? "Could not create document.");
      setBusy(null);
    }
  }

  async function upload(file: File) {
    setBusy("upload");
    setError("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/import", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (res.ok) router.push(`/docs/${data.id}`);
    else {
      setError(data.error ?? "Upload failed.");
      setBusy(null);
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <div className="flex flex-col items-end gap-1">
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
      <p className="text-xs text-stone-500">Import supports .txt, .md and .docx (max 2 MB)</p>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    </div>
  );
}
