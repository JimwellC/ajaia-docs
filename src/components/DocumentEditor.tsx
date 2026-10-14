"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Toolbar from "./Toolbar";
import SharePanel from "./SharePanel";
import { useDocumentSaver, type SaveState } from "./useDocumentSaver";
import { api } from "@/lib/api";
import type { Role } from "@/lib/access";
import type { Collaborator } from "@/server/repo";

interface Props {
  doc: {
    id: string;
    title: string;
    content: string;
    version: number;
    ownerName: string;
    collaborators: Collaborator[];
  };
  role: Role;
}

const STATUS: Record<SaveState, string> = {
  saved: "All changes saved",
  dirty: "Unsaved changes",
  saving: "Saving…",
  error: "Couldn't save.",
  conflict: "Not saved: edit conflict",
};

export default function DocumentEditor({ doc, role }: Props) {
  const router = useRouter();
  const readOnly = role === "viewer";
  const [title, setTitle] = useState(doc.title);
  const [titleError, setTitleError] = useState("");
  const saver = useDocumentSaver(doc.id, doc.version);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Placeholder.configure({ placeholder: readOnly ? "" : "Start writing…" }),
    ],
    content: doc.content,
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: { attributes: { class: "doc-content", "aria-label": "Document content" } },
    onUpdate: ({ editor }) => saver.schedule({ content: editor.getHTML() }),
  });

  function commitTitle() {
    const next = title.trim();
    if (!next) {
      setTitleError("Title cannot be empty.");
      return;
    }
    setTitleError("");
    if (next !== title) setTitle(next);
    saver.schedule({ title: next }, 0);
  }

  function useTheirs() {
    const latest = saver.acceptTheirs();
    if (!latest) return;
    setTitle(latest.title);
    editor?.commands.setContent(latest.content, false);
  }

  function keepMine() {
    saver.keepMine({ title: title.trim() || doc.title, content: editor?.getHTML() ?? "" });
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3 text-sm">
          <Link href="/" className="text-stone-600 hover:text-stone-900">← All documents</Link>
          {!readOnly && (
            <span
              className={saver.state === "error" || saver.state === "conflict" ? "text-red-600" : "text-stone-500"}
              aria-live="polite"
            >
              {saver.state === "error" ? saver.error || STATUS.error : STATUS[saver.state]}{" "}
              {saver.state === "error" && (
                <button className="underline" onClick={() => void saver.flush()}>Retry</button>
              )}
            </span>
          )}
        </div>

        {saver.state === "conflict" && (
          <div role="alert" className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">Someone else saved changes to this document while you were editing.</p>
            <p className="mt-1">Your latest changes are not saved yet. Choose which version to keep:</p>
            <div className="mt-2 flex gap-2">
              <button onClick={useTheirs} className="rounded-md border border-amber-400 bg-white px-3 py-1">
                Load their version
              </button>
              <button onClick={keepMine} className="rounded-md bg-amber-900 px-3 py-1 text-white">
                Keep mine
              </button>
            </div>
          </div>
        )}

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={readOnly ? undefined : commitTitle}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          readOnly={readOnly}
          maxLength={120}
          aria-label="Document title"
          className="w-full rounded-md bg-transparent px-1 text-2xl font-bold outline-none read-only:cursor-default hover:bg-white focus:bg-white focus:ring-2 focus:ring-stone-300 read-only:hover:bg-transparent read-only:focus:ring-0"
        />
        {titleError && <p className="mt-1 text-sm text-red-600" role="alert">{titleError}</p>}

        <div className="mt-4 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          {readOnly ? (
            <div className="border-b border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600">
              View only. Ask {doc.ownerName} for edit access.
            </div>
          ) : (
            <Toolbar editor={editor} />
          )}
          <div className="px-8 py-6 sm:px-12">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
          <p className="text-stone-500">Owner</p>
          <p className="font-medium">{role === "owner" ? "You" : doc.ownerName}</p>
          {role !== "owner" && (
            <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-amber-800">
              Shared with you · {role === "editor" ? "can edit" : "can view"}
            </p>
          )}
          {role === "owner" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <DeleteButton docId={doc.id} onDeleted={() => router.push("/")} />
            </div>
          )}
        </div>
        {role === "owner" && <SharePanel docId={doc.id} initial={doc.collaborators} />}
      </aside>
    </main>
  );
}

function DeleteButton({ docId, onDeleted }: { docId: string; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    try {
      await api(`/api/documents/${docId}`, { method: "DELETE" });
      onDeleted();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (!confirming)
    return (
      <button onClick={() => setConfirming(true)} className="rounded-md border border-stone-300 px-3 py-1.5 text-red-700 hover:bg-red-50">
        Delete
      </button>
    );
  return (
    <span className="flex w-full flex-wrap items-center gap-2">
      <span className="text-stone-600">Delete for everyone?</span>
      <button disabled={busy} onClick={remove} className="rounded-md bg-red-700 px-3 py-1.5 text-white disabled:opacity-60">
        {busy ? "Deleting…" : "Delete"}
      </button>
      <button onClick={() => setConfirming(false)} className="underline">Cancel</button>
      {error && <span className="w-full text-red-600">{error}</span>}
    </span>
  );
}
