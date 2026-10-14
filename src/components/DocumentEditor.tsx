"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Toolbar from "./Toolbar";
import SharePanel, { type Collaborator } from "./SharePanel";
import type { Role } from "@/lib/access";

type SaveState = "saved" | "dirty" | "saving" | "error";
const AUTOSAVE_MS = 800;

interface Props {
  doc: { id: string; title: string; content: string; ownerName: string; collaborators: Collaborator[] };
  role: Role;
}

export default function DocumentEditor({ doc, role }: Props) {
  const [title, setTitle] = useState(doc.title);
  const [savedTitle, setSavedTitle] = useState(doc.title);
  const [titleError, setTitleError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const pendingContent = useRef<string | null>(null);

  // Save the latest content. Saves run one at a time so an older request can't overwrite a newer one.
  const flush = useCallback(async () => {
    if (inFlight.current) await inFlight.current;
    const content = pendingContent.current;
    if (content === null) return;
    pendingContent.current = null;
    setSaveState("saving");
    inFlight.current = (async () => {
      try {
        const res = await fetch(`/api/documents/${doc.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (!res.ok) throw new Error();
        setSaveState(pendingContent.current === null ? "saved" : "dirty");
      } catch {
        // Keep the unsaved content so "Retry" can resend it.
        if (pendingContent.current === null) pendingContent.current = content;
        setSaveState("error");
      } finally {
        inFlight.current = null;
      }
    })();
    await inFlight.current;
  }, [doc.id]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
    content: doc.content,
    immediatelyRender: false,
    editorProps: { attributes: { class: "doc-content" } },
    onUpdate: ({ editor }) => {
      pendingContent.current = editor.getHTML();
      setSaveState("dirty");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, AUTOSAVE_MS);
    },
  });

  // Warn before leaving with unsaved changes, and flush on unmount.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingContent.current !== null || inFlight.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (timer.current) clearTimeout(timer.current);
      void flush();
    };
  }, [flush]);

  async function saveTitle() {
    const next = title.trim();
    if (next === savedTitle) return setTitle(savedTitle);
    if (!next) {
      setTitleError("Title cannot be empty.");
      return setTitle(savedTitle);
    }
    setTitleError("");
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: next }),
    });
    if (res.ok) {
      setSavedTitle(next);
      setTitle(next);
    } else {
      const data = await res.json().catch(() => ({}));
      setTitleError(data.error ?? "Could not rename the document.");
      setTitle(savedTitle);
    }
  }

  const statusText: Record<SaveState, string> = {
    saved: "All changes saved",
    dirty: "Unsaved changes",
    saving: "Saving…",
    error: "Couldn't save.",
  };

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3 text-sm">
          <Link href="/" className="text-stone-600 hover:text-stone-900">← All documents</Link>
          <span className={saveState === "error" ? "text-red-600" : "text-stone-500"} aria-live="polite">
            {statusText[saveState]}{" "}
            {saveState === "error" && (
              <button className="underline" onClick={() => void flush()}>Retry</button>
            )}
          </span>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          maxLength={120}
          aria-label="Document title"
          className="w-full rounded-md bg-transparent px-1 text-2xl font-bold outline-none hover:bg-white focus:bg-white focus:ring-2 focus:ring-stone-300"
        />
        {titleError && <p className="mt-1 text-sm text-red-600" role="alert">{titleError}</p>}

        <div className="mt-4 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <Toolbar editor={editor} />
          <div className="px-8 py-6 sm:px-12">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
          <p className="text-stone-500">Owner</p>
          <p className="font-medium">{role === "owner" ? "You" : doc.ownerName}</p>
          {role === "editor" && (
            <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-amber-800">Shared with you · you can edit</p>
          )}
        </div>
        <SharePanel docId={doc.id} isOwner={role === "owner"} initial={doc.collaborators} />
      </aside>
    </main>
  );
}
