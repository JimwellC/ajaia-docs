"use client";
// The "⋯" actions for a document (sidebar items and home table rows), and the shared download links.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, FileText, MoreHorizontal, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import Popover, { menuItemClass } from "./Popover";

export const exportHref = (id: string, format: "md" | "txt") => `/api/documents/${id}/export?format=${format}`;

/** "Download as Markdown" and "Download as plain text" links (the server sends the filename). */
export function DownloadLinks({ docId, onPick }: { docId: string; onPick?: () => void }) {
  return (
    <>
      <a href={exportHref(docId, "md")} download onClick={onPick} className={menuItemClass}>
        <Download size={15} aria-hidden="true" /> Download as Markdown
      </a>
      <a href={exportHref(docId, "txt")} download onClick={onPick} className={menuItemClass}>
        <FileText size={15} aria-hidden="true" /> Download as plain text
      </a>
    </>
  );
}

export default function DocMenu({
  doc,
  canDelete,
  isCurrent = false,
  className = "",
}: {
  doc: { id: string; title: string };
  canDelete: boolean;
  isCurrent?: boolean;
  className?: string;
}) {
  return (
    <Popover
      label={`Actions for ${doc.title}`}
      buttonContent={<MoreHorizontal size={16} aria-hidden="true" />}
      buttonClassName={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-muted hover:bg-selected aria-expanded:opacity-100 focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 ${className}`}
      panelLabel={`Actions for ${doc.title}`}
      width={232}
    >
      {(close) => <MenuBody doc={doc} canDelete={canDelete} isCurrent={isCurrent} close={close} />}
    </Popover>
  );
}

function MenuBody({
  doc,
  canDelete,
  isCurrent,
  close,
}: {
  doc: { id: string; title: string };
  canDelete: boolean;
  isCurrent: boolean;
  close: () => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);

  // The Delete item disappears when the confirmation shows, so move focus to Cancel.
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
  }, [confirming]);

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await api(`/api/documents/${doc.id}`, { method: "DELETE" });
      if (isCurrent) router.push("/");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (confirming)
    return (
      <div className="p-2">
        <p className="text-ink">
          Delete <span className="font-medium">{doc.title}</span> for everyone? This can&apos;t be undone.
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className="rounded-md bg-red-700 px-3 py-1 text-white hover:bg-red-800 disabled:opacity-60"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
          <button ref={cancelRef} type="button" onClick={() => setConfirming(false)} className="rounded-md px-3 py-1 text-ink hover:bg-hover">
            Cancel
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-red-700">
            {error}
          </p>
        )}
      </div>
    );

  return (
    <>
      <Link href={`/docs/${doc.id}`} onClick={close} className={menuItemClass}>
        <ExternalLink size={15} aria-hidden="true" /> Open
      </Link>
      <DownloadLinks docId={doc.id} onPick={close} />
      {canDelete && (
        <>
          <div className="my-1 h-px bg-line" />
          <button type="button" onClick={() => setConfirming(true)} className={`${menuItemClass} text-red-700`}>
            <Trash2 size={15} aria-hidden="true" /> Delete
          </button>
        </>
      )}
    </>
  );
}
