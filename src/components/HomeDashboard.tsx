"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState } from "react";
import { FilePlus2, Search, Upload, X } from "lucide-react";
import type { DocSummary } from "@/server/repo";
import { exactTime, greeting, relativeTime } from "@/lib/time";
import { NavButton } from "./AppShell";
import DocMenu from "./DocMenu";
import { useCreateDocument } from "./useCreateDocument";
import { useNow } from "./useNow";

export type View = "all" | "private" | "shared";
const VIEWS: { id: View; label: string }[] = [
  { id: "all", label: "All" },
  { id: "private", label: "Private" },
  { id: "shared", label: "Shared" },
];

type Row = DocSummary & { access: "Owner" | "Can edit" | "Can view" };

export default function HomeDashboard({
  userName,
  owned,
  shared,
  initialView,
}: {
  userName: string;
  owned: DocSummary[];
  shared: DocSummary[];
  initialView: View;
}) {
  const router = useRouter();
  const now = useNow();
  const create = useCreateDocument();
  const [view, setView] = useState<View>(initialView);
  const [query, setQuery] = useState("");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const ids = useId();

  const rows: Row[] = useMemo(() => {
    const mine = owned.map((d) => ({ ...d, access: "Owner" as const }));
    const theirs = shared.map((d) => ({ ...d, access: d.role === "viewer" ? ("Can view" as const) : ("Can edit" as const) }));
    const list = view === "private" ? mine : view === "shared" ? theirs : [...mine, ...theirs];
    return list.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [owned, shared, view]);

  const q = query.trim().toLowerCase();
  const visible = q ? rows.filter((r) => r.title.toLowerCase().includes(q)) : rows;

  function selectView(next: View, focus = false) {
    setView(next);
    // Keep the tab in the URL without a server round trip, so refresh keeps it.
    const url = next === "all" ? "/" : `/?view=${next}`;
    window.history.replaceState(null, "", url);
    if (focus) tabRefs.current[VIEWS.findIndex((v) => v.id === next)]?.focus();
  }

  function onTabKey(e: React.KeyboardEvent, index: number) {
    const last = VIEWS.length - 1;
    const next = e.key === "ArrowRight" ? (index === last ? 0 : index + 1) : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (next === null) return;
    e.preventDefault();
    selectView(VIEWS[next].id, true);
  }

  const firstName = userName.split(" ")[0];
  const emptyText =
    view === "shared" ? "Nothing has been shared with you yet." : "No documents yet. Create one or import a file to get started.";

  return (
    <>
      <header className="sticky top-0 z-20 flex h-12 items-center gap-2 bg-white px-3">
        <NavButton />
        <span className="text-sm text-ink-muted">Home</span>
      </header>

      <main className="mx-auto max-w-4xl px-5 pb-16 pt-6 sm:px-10 sm:pt-10">
        <h1 className="text-3xl font-bold tracking-tight">{now === null ? `Hello, ${firstName}` : `${greeting(new Date(now).getHours())}, ${firstName}`}</h1>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={create.createBlank} disabled={create.busy !== null} className="flex items-start gap-3 rounded-lg bg-sidebar p-4 text-left hover:bg-hover disabled:opacity-60">
            <FilePlus2 size={20} aria-hidden="true" className="mt-0.5 text-ink-muted" />
            <span>
              <span className="block font-medium">{create.busy === "new" ? "Creating…" : "New document"}</span>
              <span className="block text-sm text-ink-muted">Start from a blank page</span>
            </span>
          </button>
          <button type="button" onClick={create.chooseFile} disabled={create.busy !== null} className="flex items-start gap-3 rounded-lg bg-sidebar p-4 text-left hover:bg-hover disabled:opacity-60">
            <Upload size={20} aria-hidden="true" className="mt-0.5 text-ink-muted" />
            <span>
              <span className="block font-medium">{create.busy === "upload" ? "Importing…" : "Import file"}</span>
              <span className="block text-sm text-ink-muted">.txt, .md, .docx up to 2 MB</span>
            </span>
          </button>
          <input {...create.fileInputProps} />
        </div>
        {create.error && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {create.error}
          </p>
        )}

        <section className="mt-12" aria-labelledby={`${ids}-heading`}>
          <h2 id={`${ids}-heading`} className="sr-only">
            Documents
          </h2>
          <div className="flex flex-col gap-3 border-b border-line pb-2 sm:flex-row sm:items-center sm:justify-between">
            <div role="tablist" aria-label="Filter documents" className="flex gap-1">
              {VIEWS.map((v, i) => (
                <button
                  key={v.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  id={`${ids}-tab-${v.id}`}
                  type="button"
                  role="tab"
                  aria-selected={view === v.id}
                  aria-controls={`${ids}-panel`}
                  tabIndex={view === v.id ? 0 : -1}
                  onClick={() => selectView(v.id)}
                  onKeyDown={(e) => onTabKey(e, i)}
                  className={`rounded-md px-2.5 py-1 text-sm ${view === v.id ? "bg-selected font-medium text-ink" : "text-ink-muted hover:bg-hover"}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div className="relative sm:w-64">
              <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setQuery("")}
                placeholder="Search by title"
                aria-label="Search documents by title"
                className="w-full rounded-md bg-sidebar py-1.5 pl-8 pr-8 text-sm placeholder:text-ink-muted [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    searchRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="absolute right-1.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-ink-muted hover:bg-hover"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <div id={`${ids}-panel`} role="tabpanel" aria-labelledby={`${ids}-tab-${view}`}>
            {visible.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-muted" role="status">
                {q ? `No documents match "${query.trim()}".` : emptyText}
              </p>
            ) : (
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-ink-muted">
                    <th scope="col" className="py-2 pl-2 pr-3 font-normal">Name</th>
                    <th scope="col" className="hidden w-36 py-2 pr-3 font-normal sm:table-cell">Owner</th>
                    <th scope="col" className="hidden w-28 py-2 pr-3 font-normal sm:table-cell">Your access</th>
                    <th scope="col" className="w-32 py-2 pr-3 font-normal">Last edited</th>
                    <th scope="col" className="w-9 py-2">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => router.push(`/docs/${d.id}`)}
                      className="group cursor-pointer border-b border-line hover:bg-sidebar"
                    >
                      <td className="truncate py-2.5 pl-2 pr-3">
                        <Link href={`/docs/${d.id}`} onClick={(e) => e.stopPropagation()} className="rounded font-medium">
                          {d.title}
                        </Link>
                      </td>
                      <td className="hidden truncate py-2.5 pr-3 text-ink-muted sm:table-cell">{d.access === "Owner" ? "You" : d.ownerName}</td>
                      <td className="hidden py-2.5 pr-3 text-ink-muted sm:table-cell">{d.access}</td>
                      <td className="truncate py-2.5 pr-3 text-ink-muted">
                        <time dateTime={new Date(d.updatedAt).toISOString()} title={now === null ? undefined : exactTime(d.updatedAt)}>
                          {now === null ? "" : relativeTime(d.updatedAt, now)}
                        </time>
                      </td>
                      <td className="py-2.5 pr-1 text-right">
                        <DocMenu doc={d} canDelete={d.access === "Owner"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
