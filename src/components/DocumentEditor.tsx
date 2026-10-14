"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { ChevronDown, Download, Share2 } from "lucide-react";
import Toolbar from "./Toolbar";
import SharePanel from "./SharePanel";
import Popover from "./Popover";
import { DownloadLinks } from "./DocMenu";
import { NavButton } from "./AppShell";
import { useDocumentSaver, type Latest, type SaveState } from "./useDocumentSaver";
import { useLiveUpdates } from "./useLiveUpdates";
import { useNow } from "./useNow";
import { editorExtensions } from "@/lib/editorExtensions";
import { relativeTime } from "@/lib/time";
import type { Role } from "@/lib/access";
import type { Collaborator, PresenceEntry } from "@/server/repo";

interface Props {
  doc: {
    id: string;
    title: string;
    content: string;
    version: number;
    ownerName: string;
    updatedAt: string;
    collaborators: Collaborator[];
  };
  role: Role;
}

const FAILURE: Partial<Record<SaveState, string>> = {
  error: "Couldn't save.",
  offline: "Can't reach the server. Your changes are kept here and will retry automatically.",
  conflict: "Not saved: edit conflict",
  gone: "Not saved",
  readonly: "Not saved",
};

const ROLE_LABEL = { owner: "Owner", editor: "Can edit", viewer: "Can view" } as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function typingLabel(others: PresenceEntry[]) {
  const names = others.filter((p) => p.isTyping).map((p) => p.name);
  if (names.length === 0) return "";
  return names.length === 1 ? `${names[0]} is typing…` : `${names.join(" and ")} are typing…`;
}

const REMOTE_LABEL_MS = 4000; // how long "Updated by another user" stays up
const SAVED_LABEL_MS = 60_000; // show "Saved" for a minute after a confirmed save, then "Edited … ago"

const topButton = "inline-flex h-8 max-md:h-10 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm text-ink hover:bg-hover";

export default function DocumentEditor({ doc, role }: Props) {
  const router = useRouter();
  const now = useNow();
  const [title, setTitle] = useState(doc.title);
  const [titleError, setTitleError] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(48);
  const lastEditAt = useRef<number | null>(null);
  const savedTitle = useRef(doc.title); // the title last committed or received; differs from `title` while typing one
  const [remoteAt, setRemoteAt] = useState<number | null>(null);
  const [others, setOthers] = useState<PresenceEntry[]>([]);
  // A renamed document should update in the sidebar and lists.
  const saver = useDocumentSaver(doc.id, doc.version, { onSaved: (patch) => patch.title !== undefined && router.refresh() });
  // A 403 on save means an owner downgraded us to viewer while we were editing.
  const readOnly = role === "viewer" || saver.state === "readonly";
  const section = role === "owner" ? "Private" : "Shared";

  const editor = useEditor({
    extensions: [...editorExtensions, Placeholder.configure({ placeholder: readOnly ? "" : "Start writing…" })],
    content: doc.content,
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "doc-content", "aria-label": "Document content" },
      handleKeyDown: (view, event) => {
        // Ctrl+K / Cmd+K opens the link popover.
        if (view.editable && (event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "k") {
          event.preventDefault();
          setLinkOpen(true);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      lastEditAt.current = Date.now();
      saver.schedule({ content: editor.getHTML() });
    },
  });

  useEffect(() => {
    // emitUpdate=false: toggling editability must not look like an edit (that would trigger a save).
    if (editor && editor.isEditable === readOnly) editor.setEditable(!readOnly, false);
  }, [editor, readOnly]);

  // Show other people's saved changes. Applying them never triggers a save (emitUpdate=false).
  useLiveUpdates({
    docId: doc.id,
    enabled: !!editor && saver.state !== "gone" && saver.state !== "readonly",
    getVersion: saver.getVersion,
    isBusy: () => saver.isBusy() || title !== savedTitle.current,
    lastEditAt: () => lastEditAt.current,
    onRemote: applyRemote,
    onPresence: setOthers,
    onStop: saver.stop,
  });

  useEffect(() => {
    if (!remoteAt) return;
    const id = setTimeout(() => setRemoteAt(null), REMOTE_LABEL_MS);
    return () => clearTimeout(id);
  }, [remoteAt]);

  function applyRemote(latest: Latest) {
    savedTitle.current = latest.title;
    setTitle(latest.title);
    editor?.commands.setContent(latest.content, false);
    saver.adoptRemote(latest.version);
    setRemoteAt(Date.now());
  }

  // The toolbar sticks just below the top bar, whose height changes when it wraps on narrow screens.
  useEffect(() => {
    const el = header.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeaderHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function commitTitle() {
    const next = title.trim();
    if (!next) {
      setTitleError("Title cannot be empty.");
      return;
    }
    setTitleError("");
    if (next !== title) setTitle(next);
    savedTitle.current = next;
    saver.schedule({ title: next }, 0);
  }

  function useTheirs() {
    const latest = saver.acceptTheirs();
    if (!latest) return;
    savedTitle.current = latest.title;
    setTitle(latest.title);
    editor?.commands.setContent(latest.content, false);
  }

  function keepMine() {
    savedTitle.current = title.trim() || doc.title;
    saver.keepMine({ title: savedTitle.current, content: editor?.getHTML() ?? "" });
  }

  const failure = FAILURE[saver.state];
  let status = "";
  if (failure) status = saver.state === "error" ? saver.error || failure : failure;
  else if (saver.state === "dirty" || saver.state === "saving") status = "Saving…";
  else if (remoteAt) status = "Updated by another user";
  else if (saver.lastSavedAt && (now === null || now - saver.lastSavedAt < SAVED_LABEL_MS)) status = "Saved";
  else if (now !== null) status = `Edited ${relativeTime(saver.lastSavedAt ?? doc.updatedAt, now)}`;

  return (
    <>
      <header ref={header} className="sticky top-0 z-20 flex flex-wrap items-center gap-x-1 gap-y-1 bg-white px-3 py-2 sm:flex-nowrap">
        <NavButton />
        <nav aria-label="Breadcrumb" className="min-w-0 flex-1 px-1">
          <ol className="flex min-w-0 items-center gap-1.5 text-sm">
            <li className="shrink-0">
              <Link href={`/?view=${section.toLowerCase()}`} className="rounded px-1 text-ink-muted hover:bg-hover max-md:inline-flex max-md:h-10 max-md:items-center">
                {section}
              </Link>
            </li>
            <li aria-hidden="true" className="text-ink-muted">
              /
            </li>
            <li className="min-w-0 truncate" aria-current="page">
              {title.trim() || doc.title}
            </li>
          </ol>
        </nav>
        <span
          aria-live="polite"
          className={`order-last basis-full px-1 text-sm sm:order-none sm:basis-auto sm:pr-2 ${failure ? "text-red-700" : "text-ink-muted"}`}
        >
          {status}
          {(saver.state === "error" || saver.state === "offline") && (
            <>
              {" "}
              <button type="button" className="underline" onClick={() => void saver.flush()}>
                Retry
              </button>
            </>
          )}
        </span>
        <span aria-live="polite" className="hidden px-1 text-sm italic text-ink-muted sm:inline">
          {typingLabel(others)}
        </span>
        {others.length > 0 && (
          <ul aria-label="Also viewing" className="flex shrink-0 -space-x-1 px-1">
            {others.map((p) => {
              const label = `${p.name} · ${ROLE_LABEL[p.role]}`;
              return (
                <li key={p.id}>
                  <span
                    title={label}
                    aria-label={label}
                    role="img"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#e3e2de] text-xs font-medium text-ink ring-2 ring-white"
                  >
                    {initials(p.name)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <Popover
          buttonContent={
            <>
              <Download size={15} aria-hidden="true" />
              <span className="hidden lg:inline">Download</span>
              <span className="sr-only lg:hidden">Download</span>
              <ChevronDown size={14} aria-hidden="true" className="text-ink-muted" />
            </>
          }
          buttonClassName={topButton}
          panelLabel="Download"
          width={232}
        >
          {(close) => <DownloadLinks docId={doc.id} onPick={close} />}
        </Popover>
        <Popover
          buttonContent={
            <>
              <Share2 size={15} aria-hidden="true" /> Share
            </>
          }
          buttonClassName={topButton}
          panelRole="dialog"
          panelLabel="Share"
          width={320}
        >
          {() =>
            role === "owner" ? (
              <SharePanel docId={doc.id} initial={doc.collaborators} />
            ) : (
              <div className="p-3">
                <p className="font-medium">Shared with you</p>
                <p className="mt-1 text-ink-muted">
                  Owned by {doc.ownerName}. You can {role === "editor" && !readOnly ? "edit" : "view"} this document.
                </p>
                <p className="mt-1 text-ink-muted">Only the owner can change who has access.</p>
              </div>
            )
          }
        </Popover>
      </header>

      <main className="mx-auto w-full max-w-[720px] px-5 sm:px-8 lg:px-0">
        {saver.state === "gone" && (
          <div role="alert" className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-900">
            This document was deleted or you no longer have access.{" "}
            <Link href="/" className="font-medium underline">
              Back to all documents
            </Link>
          </div>
        )}

        {saver.state === "readonly" && (
          <div role="alert" className="mt-6 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            Your access changed to view-only. Your latest changes were not saved.
          </div>
        )}

        {saver.state === "conflict" && (
          <div role="alert" className="mt-6 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">Someone else saved changes to this document while you were editing.</p>
            <p className="mt-1">Your latest changes are not saved yet. Choose which version to keep:</p>
            <div className="mt-2 flex gap-2">
              <button onClick={useTheirs} className="rounded-md bg-white px-3 py-1 ring-1 ring-amber-300 hover:bg-amber-100">
                Load their version
              </button>
              <button onClick={keepMine} className="rounded-md bg-amber-900 px-3 py-1 text-white hover:bg-amber-950">
                Keep mine
              </button>
            </div>
          </div>
        )}

        <h1 className="sr-only">{title || doc.title}</h1>
        <input
          value={title}
          onChange={(e) => {
            lastEditAt.current = Date.now();
            setTitle(e.target.value);
          }}
          onBlur={readOnly ? undefined : commitTitle}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          readOnly={readOnly}
          maxLength={120}
          placeholder="Untitled"
          aria-label="Document title"
          className="mt-10 w-full rounded-md bg-transparent text-[1.75rem] max-md:py-1 font-bold leading-tight tracking-tight outline-none placeholder:text-[#a5a29c] read-only:cursor-default focus-visible:ring-2 focus-visible:ring-ink-muted/60 sm:mt-14 sm:text-[2.5rem]"
        />
        {titleError && (
          <p className="mt-1 text-sm text-red-700" role="alert">
            {titleError}
          </p>
        )}

        <div className="mt-4">
          {readOnly ? (
            <p className="border-b border-line pb-2 text-sm text-ink-muted">View only. Ask {doc.ownerName} for edit access.</p>
          ) : (
            <Toolbar editor={editor} linkOpen={linkOpen} setLinkOpen={setLinkOpen} stickyTop={headerHeight} />
          )}
          <div className="pt-4">
            <EditorContent editor={editor} />
          </div>
        </div>
      </main>
    </>
  );
}
