"use client";
import Link from "next/link";
import { useState } from "react";
import type { DocSummary } from "@/server/repo";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function DocumentList({ owned, shared }: { owned: DocSummary[]; shared: DocSummary[] }) {
  const [tab, setTab] = useState<"owned" | "shared">("owned");
  const docs = tab === "owned" ? owned : shared;

  const tabClass = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium ${active ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-200"}`;

  return (
    <section className="mt-6">
      <div className="flex gap-2">
        <button className={tabClass(tab === "owned")} onClick={() => setTab("owned")}>
          My documents ({owned.length})
        </button>
        <button className={tabClass(tab === "shared")} onClick={() => setTab("shared")}>
          Shared with me ({shared.length})
        </button>
      </div>

      {docs.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-500">
          {tab === "owned"
            ? "No documents yet. Create one or import a file to get started."
            : "Nothing has been shared with you yet."}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white">
          {docs.map((d) => (
            <li key={d.id}>
              <Link href={`/docs/${d.id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-stone-50 focus-visible:outline-offset-[-2px] sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="font-medium">{d.title}</span>
                <span className="text-sm text-stone-600 sm:shrink-0 sm:text-right">
                  {tab === "shared" && (
                    <>
                      <span className="mr-2 rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">
                        {d.role === "viewer" ? "Can view" : "Can edit"}
                      </span>
                      <span className="mr-3">Owner: {d.ownerName}</span>
                    </>
                  )}
                  Edited {formatDate(d.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
