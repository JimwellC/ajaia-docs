"use client";
// Shared "New document" and "Import file" behavior for the sidebar and the home page.
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/lib/api";

export const IMPORT_ACCEPT = ".txt,.md,.docx";

export function useCreateDocument() {
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

  return {
    busy,
    error,
    createBlank,
    chooseFile: () => fileInput.current?.click(),
    /** Render once next to the Import button. */
    fileInputProps: {
      ref: fileInput,
      type: "file" as const,
      accept: IMPORT_ACCEPT,
      className: "hidden",
      tabIndex: -1,
      "aria-hidden": true,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) void upload(f);
      },
    },
  };
}
